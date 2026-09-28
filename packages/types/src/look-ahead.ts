/**
 * Looking further ahead than today: which stretch of time the home screen
 * shows, and how a longer list is laid out by day.
 */

import {
  NIGHT_ENDS_AT_HOUR,
  chooseHomeScope,
  getTodayLabel,
  type HomeScope,
  type WhenOption,
} from './event-utils';

const MS_PER_HOUR = 60 * 60 * 1000;
const DAYS_BEFORE_THE_DATE_IS_NEEDED = 7;

/**
 * The stretch of time to show. Once someone has chosen, that is what they
 * get. Until then it is today, or the week when today is thin.
 */
export const resolveHomeScope = (chosen: HomeScope | null, eventsTodayCount: number): HomeScope =>
  chosen ?? chooseHomeScope(eventsTodayCount);

export interface DayGroup<T> {
  /** YYYY-MM-DD, for the day the night belongs to */
  dayKey: string;
  /** "Today", "Tomorrow", or "Saturday, Oct 17" */
  label: string;
  events: T[];
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Midnight at the start of the day a moment belongs to. 1 AM belongs to the day before. */
const startOfNightDay = (ms: number): Date => {
  const day = new Date(ms - NIGHT_ENDS_AT_HOUR * MS_PER_HOUR);
  day.setHours(0, 0, 0, 0);
  return day;
};

const toKey = (day: Date): string =>
  `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

const daysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / (24 * MS_PER_HOUR));

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Events under a heading for each day, soonest first. Days run from 4 AM to
 * 4 AM, so 1 AM on Saturday sits with Friday night. Something already under
 * way sits with today.
 */
export const groupEventsByDay = <T extends { startsAtMs: number }>(
  events: T[],
  nowMs: number
): Array<DayGroup<T>> => {
  const today = startOfNightDay(nowMs);
  const groups = new Map<string, { day: Date; events: T[] }>();

  for (const event of [...events].sort((a, b) => a.startsAtMs - b.startsAtMs)) {
    const started = startOfNightDay(event.startsAtMs);
    const day = started.getTime() < today.getTime() ? today : started;
    const key = toKey(day);
    const group = groups.get(key) ?? { day, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, { day, events: onTheDay }]) => {
      const daysAway = daysBetween(today, day);
      const label =
        daysAway === 0
          ? capitalize(getTodayLabel(new Date(nowMs)))
          : daysAway === 1
            ? 'Tomorrow'
            : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return { dayKey, label, events: onTheDay };
    });
};

/**
 * The day to show beside a time: nothing for later today, "Sat" for the
 * next six days, and "Sat, Oct 17" from a week away, when the weekday alone
 * could mean two different days. Goes by the calendar.
 */
export const formatDayShort = (startsAtMs: number, nowMs: number): string | null => {
  const start = new Date(startsAtMs);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const now = new Date(nowMs);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysAway = daysBetween(today, startDay);
  if (daysAway === 0) {
    return null;
  }
  if (Math.abs(daysAway) < DAYS_BEFORE_THE_DATE_IS_NEEDED) {
    return start.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/** "today", "tonight", "this week", or "this month": the stretch of time being shown */
export const formatPeriod = (scope: HomeScope, now: Date): string => {
  if (scope === 'week') return 'this week';
  if (scope === 'month') return 'this month';
  return getTodayLabel(now);
};

/** 'tonight' covers the rest of today; its label follows the time of day */
export const WHEN_OPTIONS: WhenOption[] = ['tonight', 'tomorrow', 'weekend', 'week', 'month'];

const WHEN_FOR_SCOPE: Record<HomeScope, WhenOption> = {
  today: 'tonight',
  week: 'week',
  month: 'month',
};

/**
 * What a list shows when it opens: what the link asked for, otherwise the
 * same stretch of time as the home screen.
 */
export const chooseWhen = (asked: unknown, homeScope: HomeScope): WhenOption => {
  const option = WHEN_OPTIONS.find((choice) => choice === asked);
  return option ?? WHEN_FOR_SCOPE[homeScope];
};

/** True when a list needs a heading for each day */
export const coversSeveralDays = (when: WhenOption): boolean =>
  when !== 'tonight' && when !== 'tomorrow';

/** True when two moments belong to the same night out. 1 AM belongs to the night before. */
export const isSameNight = (aMs: number, bMs: number): boolean =>
  startOfNightDay(aMs).getTime() === startOfNightDay(bMs).getTime();
