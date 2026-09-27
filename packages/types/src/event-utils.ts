/**
 * Date logic for events. Everything here takes plain millisecond values so it
 * runs the same in the Expo app, the dashboards, and Cloud Functions.
 */

import type { EventFilters, EventListing } from './event';

export const STARTING_SOON_MINUTES = 60;

/** The hour a night is considered over. 1:30 AM still belongs to "tonight". */
export const NIGHT_ENDS_AT_HOUR = 4;

const MS_PER_MINUTE = 60 * 1000;

export type EventTimingState = 'upcoming' | 'starting_soon' | 'on_now' | 'ended';

export interface EventTiming {
  state: EventTimingState;
  /** Whole minutes until the start, rounded up. 0 once it has started. */
  minutesUntilStart: number;
}

export const getEventTiming = (startsAtMs: number, endsAtMs: number, nowMs: number): EventTiming => {
  if (nowMs >= endsAtMs) {
    return { state: 'ended', minutesUntilStart: 0 };
  }
  if (nowMs >= startsAtMs) {
    return { state: 'on_now', minutesUntilStart: 0 };
  }

  const minutesUntilStart = Math.ceil((startsAtMs - nowMs) / MS_PER_MINUTE);
  return {
    state: minutesUntilStart <= STARTING_SOON_MINUTES ? 'starting_soon' : 'upcoming',
    minutesUntilStart,
  };
};

export interface TimeWindow {
  startMs: number;
  endMs: number;
}

/** From now until the night ends, in the device's local time. */
export const getTonightWindow = (now: Date): TimeWindow => {
  const end = new Date(now);
  end.setHours(NIGHT_ENDS_AT_HOUR, 0, 0, 0);
  if (end.getTime() <= now.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return { startMs: now.getTime(), endMs: end.getTime() };
};

export interface WeeklyRecurrence {
  firstStartMs: number;
  /** Last moment an occurrence may start */
  untilMs: number;
  /** Safety cap so a far-off end date can't create hundreds of documents */
  maxInstances?: number;
}

export const DEFAULT_MAX_RECURRENCE_INSTANCES = 26;

/**
 * Start times for a weekly event, first occurrence included. Steps by
 * calendar week so the local start time survives daylight saving changes.
 */
export const expandWeeklyRecurrence = ({
  firstStartMs,
  untilMs,
  maxInstances = DEFAULT_MAX_RECURRENCE_INSTANCES,
}: WeeklyRecurrence): number[] => {
  const starts = [firstStartMs];
  const next = new Date(firstStartMs);

  while (starts.length < maxInstances) {
    next.setDate(next.getDate() + 7);
    if (next.getTime() > untilMs) {
      break;
    }
    starts.push(next.getTime());
  }

  return starts;
};

type FilterableEvent = Pick<EventListing, 'activityIds' | 'coverCents' | 'tags'>;

/** True when the event satisfies every filter that is switched on. */
export const matchesEventFilters = (event: FilterableEvent, filters: EventFilters): boolean => {
  if (filters.activityId && !event.activityIds.includes(filters.activityId)) return false;
  if (filters.goodForSolo && !event.tags.goodForSolo) return false;
  if (filters.alcoholFree && !event.tags.alcoholFree) return false;
  if (filters.stepFreeEntry && !event.tags.stepFreeEntry) return false;
  if (filters.freeEntry && event.coverCents > 0) return false;
  if (filters.admitsAge && event.tags.minimumAge > filters.admitsAge) return false;
  return true;
};

/** How many events fall under each activity, keyed by activity ID. */
export const countEventsByActivity = (
  events: Array<Pick<EventListing, 'activityIds'>>
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const event of events) {
    for (const activityId of event.activityIds) {
      counts[activityId] = (counts[activityId] ?? 0) + 1;
    }
  }
  return counts;
};
