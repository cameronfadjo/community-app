/**
 * Date logic for events. Everything here takes plain millisecond values so it
 * runs the same in the Expo app, the dashboards, and Cloud Functions.
 */

import type { BusyLevel, EventFilters, EventListing, EventRepeat, EventTags } from './event';

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
  /** 1 repeats every week, 2 every other week */
  everyWeeks?: number;
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
  everyWeeks = 1,
}: WeeklyRecurrence): number[] => {
  const starts = [firstStartMs];
  const next = new Date(firstStartMs);

  while (starts.length < maxInstances) {
    next.setDate(next.getDate() + 7 * everyWeeks);
    if (next.getTime() > untilMs) {
      break;
    }
    starts.push(next.getTime());
  }

  return starts;
};

export type MonthlyRecurrence = Omit<WeeklyRecurrence, 'everyWeeks'>;

const DAYS_PER_WEEK = 7;
const LAST = 5;

/** Which one of its weekday a date is within its month: 1 to 4, or 5 for the last */
const getWeekdayOrdinal = (date: Date): number => Math.ceil(date.getDate() / DAYS_PER_WEEK);

const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

/** The day of the month the numbered weekday falls on */
const findWeekdayInMonth = (year: number, month: number, weekday: number, ordinal: number): number => {
  const firstWeekday = new Date(year, month, 1).getDay();
  const firstMatch = 1 + ((weekday - firstWeekday + DAYS_PER_WEEK) % DAYS_PER_WEEK);
  const day = firstMatch + (ordinal - 1) * DAYS_PER_WEEK;

  // A month without a fifth one uses its last
  return day > getDaysInMonth(year, month) ? day - DAYS_PER_WEEK : day;
};

/**
 * Start times for a monthly event that keeps its numbered weekday, such as
 * the 3rd Saturday. A fifth weekday is treated as the last of each month.
 */
export const expandMonthlyRecurrence = ({
  firstStartMs,
  untilMs,
  maxInstances = DEFAULT_MAX_RECURRENCE_INSTANCES,
}: MonthlyRecurrence): number[] => {
  const first = new Date(firstStartMs);
  const weekday = first.getDay();
  const ordinal = getWeekdayOrdinal(first);
  const starts = [firstStartMs];

  for (let monthsLater = 1; starts.length < maxInstances; monthsLater += 1) {
    const month = new Date(first.getFullYear(), first.getMonth() + monthsLater, 1);
    const day = findWeekdayInMonth(month.getFullYear(), month.getMonth(), weekday, ordinal);
    const next = new Date(
      month.getFullYear(),
      month.getMonth(),
      day,
      first.getHours(),
      first.getMinutes()
    );
    if (next.getTime() > untilMs) {
      break;
    }
    starts.push(next.getTime());
  }

  return starts;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['1st', '2nd', '3rd', '4th', 'last'];

/** "Every Friday" or "The 3rd Saturday of every month", read from the first date */
export const describeRecurrence = (firstStart: Date, repeat: Exclude<EventRepeat, 'none'>): string => {
  const weekday = WEEKDAYS[firstStart.getDay()];
  if (repeat === 'weekly') {
    return `Every ${weekday}`;
  }
  if (repeat === 'every_two_weeks') {
    return `Every other ${weekday}`;
  }

  const ordinal = Math.min(getWeekdayOrdinal(firstStart), LAST);
  return `The ${ORDINALS[ordinal - 1]} ${weekday} of every month`;
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

export type WhenOption = 'tonight' | 'tomorrow' | 'weekend' | 'week';

const atNightEnd = (date: Date, daysLater: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + daysLater);
  result.setHours(NIGHT_ENDS_AT_HOUR, 0, 0, 0);
  return result;
};

/**
 * The time range behind each "when" choice. Days run from 4 AM to 4 AM, so
 * the small hours of Saturday still belong to Friday night.
 */
export const getWhenWindow = (when: WhenOption, now: Date): TimeWindow => {
  const tonight = getTonightWindow(now);
  if (when === 'tonight') {
    return tonight;
  }

  if (when === 'tomorrow') {
    const start = new Date(tonight.endMs);
    return { startMs: start.getTime(), endMs: atNightEnd(start, 1).getTime() };
  }

  // The calendar day this night belongs to
  const nightOf = new Date(now);
  nightOf.setHours(nightOf.getHours() - NIGHT_ENDS_AT_HOUR);

  if (when === 'week') {
    return { startMs: now.getTime(), endMs: atNightEnd(nightOf, DAYS_PER_WEEK).getTime() };
  }

  const day = nightOf.getDay();
  const FRIDAY = 5;

  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const isWeekend = day === 0 || day >= FRIDAY;
  if (isWeekend) {
    return { startMs: now.getTime(), endMs: atNightEnd(nightOf, daysUntilMonday).getTime() };
  }

  return {
    startMs: atNightEnd(nightOf, FRIDAY - day).getTime(),
    endMs: atNightEnd(nightOf, daysUntilMonday).getTime(),
  };
};

/**
 * "18+" or "21+". Anything stored below 18 shows as 18+, so an old or
 * hand-edited event is never presented as open to under-18s.
 */
export const formatMinimumAge = (minimumAge: number | undefined): string =>
  `${Math.max(18, minimumAge ?? 18)}+`;

/** Events running or starting inside the window. Those already under way count until they end. */
export const filterEventsInWindow = <T extends { startsAtMs: number; endsAtMs: number }>(
  events: T[],
  window: TimeWindow
): T[] =>
  events.filter((event) => event.startsAtMs <= window.endMs && event.endsAtMs > window.startMs);

/**
 * True while something loaded earlier can be shown again without asking the
 * server. Saves a read of every event each time a screen opens.
 */
export const isStillFresh = (loadedAtMs: number | null, nowMs: number, maxAgeMs: number): boolean =>
  loadedAtMs !== null && nowMs >= loadedAtMs && nowMs - loadedAtMs < maxAgeMs;

/** Fewer events than this today, and the home screen shows the week instead */
export const MIN_EVENTS_FOR_TODAY = 3;

export type HomeScope = 'today' | 'week';

export const chooseHomeScope = (eventsTodayCount: number): HomeScope =>
  eventsTodayCount >= MIN_EVENTS_FOR_TODAY ? 'today' : 'week';

const EVENING_STARTS_AT_HOUR = 17;

/** The word for the rest of the day: "today" until the evening, then "tonight" */
export const getTodayLabel = (now: Date): 'today' | 'tonight' => {
  const hour = now.getHours();
  return hour >= EVENING_STARTS_AT_HOUR || hour < NIGHT_ENDS_AT_HOUR ? 'tonight' : 'today';
};

const WALKING_MINUTES_PER_KM = 12;
const LONGEST_WALK_MINUTES = 30;
const MILES_PER_KM = 0.621371;

/** "4 min walk" for short hops, miles once it is too far to walk. */
export const formatDistanceLabel = (distanceKm: number): string => {
  const minutes = Math.max(1, Math.round(distanceKm * WALKING_MINUTES_PER_KM));
  if (minutes <= LONGEST_WALK_MINUTES) {
    return `${minutes} min walk`;
  }

  const miles = distanceKm * MILES_PER_KM;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
};

export interface PickCandidate {
  id: string;
  startsAtMs: number;
  endsAtMs: number;
  distanceKm?: number;
  perkLabel?: string;
  busyLevel?: BusyLevel;
  tags: EventTags;
}

// Not worth sending someone to an event that is nearly over
const MINIMUM_MINUTES_LEFT = 30;

const scoreForPick = (event: PickCandidate, nowMs: number): number => {
  const timing = getEventTiming(event.startsAtMs, event.endsAtMs, nowMs);

  let score = 0;
  if (timing.state === 'on_now') {
    score += 40;
  } else if (timing.state === 'starting_soon') {
    score += 50 - timing.minutesUntilStart / 6;
  } else {
    score += Math.max(0, 40 - (timing.minutesUntilStart - STARTING_SOON_MINUTES) / 6);
  }

  score += event.distanceKm === undefined ? 15 : Math.max(0, 30 - event.distanceKm * 6);

  if (event.tags.goodForSolo) score += 8;
  if (event.perkLabel) score += 8;
  if (event.busyLevel === 'filling_up') score += 8;
  if (event.busyLevel === 'packed') score += 4;

  return score;
};

/**
 * Orders events for "Just pick for me", best first. Favors what is starting
 * soon and close by, with a nudge for perks, solo-friendly events, and a
 * room that is filling up.
 */
export const rankEventsForPick = <T extends PickCandidate>(events: T[], nowMs: number): T[] => {
  return events
    .filter((event) => event.endsAtMs - nowMs >= MINIMUM_MINUTES_LEFT * MS_PER_MINUTE)
    .map((event) => ({ event, score: scoreForPick(event, nowMs) }))
    .sort((a, b) => b.score - a.score)
    .map(({ event }) => event);
};
