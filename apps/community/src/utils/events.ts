import {
  DayGroup,
  EventListing,
  EventTiming,
  TimeWindow,
  filterEventsInWindow,
  formatDayShort,
  getEventTiming,
  getHostConfirmation,
  groupEventsByDay,
} from '../types';

/** "10:00 PM" in the device's locale */
export const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const getTimingFor = (event: EventListing, nowMs: number): EventTiming =>
  getEventTiming(event.startsAt.toMillis(), event.endsAt.toMillis(), nowMs);

/** True when the event was posted for a host who hasn't confirmed the details yet */
export const isUnconfirmed = (event: EventListing): boolean =>
  getHostConfirmation({
    confirmedAtMs: event.confirmedAt?.toMillis(),
    postedOnBehalfBy: event.postedOnBehalfBy,
    handedOverAtMs: event.handedOverAt?.toMillis(),
  }) === 'unconfirmed';

/** Events running or starting inside the window, in the order given */
export const eventsInWindow = <T extends EventListing>(events: T[], window: TimeWindow): T[] =>
  filterEventsInWindow(
    events.map((event) => ({
      event,
      startsAtMs: event.startsAt.toMillis(),
      endsAtMs: event.endsAt.toMillis(),
    })),
    window
  ).map(({ event }) => event);

/** Events under a heading for each day, soonest first */
export const groupByDay = <T extends EventListing>(events: T[], nowMs: number): Array<DayGroup<T>> =>
  groupEventsByDay(
    events.map((event) => ({ event, startsAtMs: event.startsAt.toMillis() })),
    nowMs
  ).map((group) => ({ ...group, events: group.events.map(({ event }) => event) }));

export { formatPeriod } from '../types';

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

interface TimingOptions {
  /** True under a heading that already names the day, so only the time is needed */
  dayShown?: boolean;
}

/** "In 18 min · 10:00 PM", "On now · until 2:00 AM", "Sat · 11:00 AM", or "Sat, Oct 17 · 11:00 AM" */
export const formatTimingLabel = (
  event: EventListing,
  nowMs: number,
  { dayShown = false }: TimingOptions = {}
): string => {
  const startMs = event.startsAt.toMillis();
  const timing = getTimingFor(event, nowMs);

  if (timing.state === 'ended') {
    return 'Ended';
  }
  if (timing.state === 'on_now') {
    return `On now · until ${formatClock(event.endsAt.toMillis())}`;
  }
  if (timing.state === 'starting_soon') {
    return `In ${timing.minutesUntilStart} min · ${formatClock(startMs)}`;
  }

  // "Sat" this week, "Sat, Oct 17" further off, when the weekday alone could mean two days
  const day = dayShown ? null : formatDayShort(startMs, nowMs);
  return day ? `${day} · ${formatClock(startMs)}` : formatClock(startMs);
};

/** Short form for badges: "Starts in 18 min", "On now", "10:00 PM" */
export const formatTimingBadge = (
  event: EventListing,
  nowMs: number,
  options: TimingOptions = {}
): string => {
  const timing = getTimingFor(event, nowMs);
  if (timing.state === 'on_now') return 'On now';
  if (timing.state === 'starting_soon') return `Starts in ${timing.minutesUntilStart} min`;
  return formatTimingLabel(event, nowMs, options);
};

/** "Free" or "$10 cover" */
export const formatCover = (coverCents: number): string => {
  if (coverCents <= 0) {
    return 'Free';
  }
  const dollars = coverCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} cover`;
};

/** "Friday night", "Saturday afternoon" */
export const formatDayPart = (now: Date): string => {
  const hour = now.getHours();
  // Before 4 AM still belongs to the night before
  const day = new Date(now);
  if (hour < 4) {
    day.setDate(day.getDate() - 1);
  }
  const weekday = day.toLocaleDateString([], { weekday: 'long' });

  if (hour < 4 || hour >= 17) return `${weekday} night`;
  if (hour < 12) return `${weekday} morning`;
  return `${weekday} afternoon`;
};
