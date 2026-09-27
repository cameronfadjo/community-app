/**
 * Decides which notifications to schedule and when. The plan is built on
 * the phone from events it has already loaded, so no location or interests
 * ever leave the device.
 */

import type { EventStatus } from './event';
import { NIGHT_ENDS_AT_HOUR, formatDistanceLabel, getWhenWindow } from './event-utils';

export const STARTING_SOON_NOTICE_MINUTES = 60;
export const MAX_STARTING_SOON_PER_NIGHT = 2;
/** iOS keeps at most 64 scheduled notifications; stay well under it */
export const MAX_PLANNED_NOTIFICATIONS = 20;
/** Events further than this aren't worth a nudge */
export const MAX_NOTIFY_DISTANCE_KM = 8;

const LINEUP_DAY = 4; // Thursday
const LINEUP_HOUR = 17;
const MAX_LINEUP_ACTIVITIES = 3;
// A nudge needs to arrive with time to act on it
const MINIMUM_LEAD_MINUTES = 5;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export interface NotificationPrefs {
  enabled: boolean;
  /** An hour before events the person would like */
  startingSoon: boolean;
  /** Thursday evening summary of the weekend */
  weekendLineup: boolean;
  /** Hide event, venue, and activity names */
  discreet: boolean;
  /** Activities to hear about. Empty means everything. */
  activityIds: string[];
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  startingSoon: true,
  weekendLineup: true,
  discreet: false,
  activityIds: [],
};

export interface PlanEvent {
  id: string;
  title: string;
  venueName: string;
  activityIds: string[];
  startsAtMs: number;
  endsAtMs: number;
  status: EventStatus;
  distanceKm?: number;
  perkLabel?: string;
}

export type PlannedNotificationKind = 'starting_soon' | 'weekend_lineup';

export interface PlannedNotification {
  id: string;
  kind: PlannedNotificationKind;
  fireAtMs: number;
  title: string;
  body: string;
  /** Opened when the notification is tapped */
  eventId?: string;
}

export interface NotificationPlanInput {
  events: PlanEvent[];
  prefs: NotificationPrefs;
  /** Display names keyed by activity ID */
  activityLabels: Record<string, string>;
  nowMs: number;
}

/** The next Thursday at 5 PM local time, strictly after now */
export const getNextLineupTime = (nowMs: number): number => {
  const next = new Date(nowMs);
  next.setHours(LINEUP_HOUR, 0, 0, 0);

  const daysAhead = (LINEUP_DAY - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysAhead);
  if (next.getTime() <= nowMs) {
    next.setDate(next.getDate() + 7);
  }
  return next.getTime();
};

/** The calendar day a night belongs to, so 1 AM Saturday is Friday night */
const getNightKey = (ms: number): string => {
  const night = new Date(ms - NIGHT_ENDS_AT_HOUR * MS_PER_HOUR);
  return `${night.getFullYear()}-${night.getMonth()}-${night.getDate()}`;
};

const joinLabels = (names: string[]): string => {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

const isRelevant = (event: PlanEvent, prefs: NotificationPrefs): boolean => {
  if (event.status !== 'scheduled') {
    return false;
  }
  if (event.distanceKm !== undefined && event.distanceKm > MAX_NOTIFY_DISTANCE_KM) {
    return false;
  }
  return (
    prefs.activityIds.length === 0 ||
    event.activityIds.some((activityId) => prefs.activityIds.includes(activityId))
  );
};

const planStartingSoon = (
  events: PlanEvent[],
  prefs: NotificationPrefs,
  nowMs: number
): PlannedNotification[] => {
  const earliestFireMs = nowMs + MINIMUM_LEAD_MINUTES * MS_PER_MINUTE;
  const byNight = new Map<string, PlanEvent[]>();

  for (const event of events) {
    const fireAtMs = event.startsAtMs - STARTING_SOON_NOTICE_MINUTES * MS_PER_MINUTE;
    if (fireAtMs < earliestFireMs) {
      continue;
    }
    const key = getNightKey(event.startsAtMs);
    byNight.set(key, [...(byNight.get(key) ?? []), event]);
  }

  const chosen: PlanEvent[] = [];
  for (const nightEvents of byNight.values()) {
    const closestFirst = [...nightEvents].sort(
      (a, b) =>
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.startsAtMs - b.startsAtMs
    );
    chosen.push(...closestFirst.slice(0, MAX_STARTING_SOON_PER_NIGHT));
  }

  return chosen.map((event) => {
    const details = [
      event.venueName,
      event.distanceKm !== undefined ? formatDistanceLabel(event.distanceKm) : null,
      event.perkLabel ? `${event.perkLabel} when you arrive` : null,
    ].filter(Boolean);

    return {
      id: `starting_soon_${event.id}`,
      kind: 'starting_soon' as const,
      fireAtMs: event.startsAtMs - STARTING_SOON_NOTICE_MINUTES * MS_PER_MINUTE,
      title: prefs.discreet
        ? 'Something you might like starts in an hour'
        : `${event.title} starts in an hour`,
      body: prefs.discreet ? 'Open Community to see what.' : details.join(' · '),
      eventId: event.id,
    };
  });
};

const planWeekendLineup = (
  events: PlanEvent[],
  prefs: NotificationPrefs,
  activityLabels: Record<string, string>,
  nowMs: number
): PlannedNotification[] => {
  const fireAtMs = getNextLineupTime(nowMs);
  const weekend = getWhenWindow('weekend', new Date(fireAtMs));
  const onThisWeekend = events.filter(
    (event) => event.startsAtMs >= weekend.startMs && event.startsAtMs < weekend.endMs
  );

  if (onThisWeekend.length === 0) {
    return [];
  }

  // Most common activities first, limited to ones the person follows
  const counts = new Map<string, number>();
  for (const event of onThisWeekend) {
    for (const activityId of event.activityIds) {
      const followed = prefs.activityIds.length === 0 || prefs.activityIds.includes(activityId);
      if (followed && activityLabels[activityId]) {
        counts.set(activityId, (counts.get(activityId) ?? 0) + 1);
      }
    }
  }
  const topLabels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LINEUP_ACTIVITIES)
    .map(([activityId]) => activityLabels[activityId] as string);

  const count = onThisWeekend.length;
  const things = count === 1 ? '1 thing' : `${count} things`;

  return [
    {
      id: 'weekend_lineup',
      kind: 'weekend_lineup',
      fireAtMs,
      title: prefs.discreet ? 'Your weekend lineup is ready' : `${things} on this weekend`,
      body:
        prefs.discreet || topLabels.length === 0
          ? "Open Community to see what's on."
          : `${joinLabels(topLabels)} near you`,
    },
  ];
};

/** Every notification to schedule, soonest first */
export const buildNotificationPlan = ({
  events,
  prefs,
  activityLabels,
  nowMs,
}: NotificationPlanInput): PlannedNotification[] => {
  if (!prefs.enabled) {
    return [];
  }

  const relevant = events.filter((event) => isRelevant(event, prefs));

  return [
    ...(prefs.startingSoon ? planStartingSoon(relevant, prefs, nowMs) : []),
    ...(prefs.weekendLineup ? planWeekendLineup(relevant, prefs, activityLabels, nowMs) : []),
  ]
    .sort((a, b) => a.fireAtMs - b.fireAtMs)
    .slice(0, MAX_PLANNED_NOTIFICATIONS);
};
