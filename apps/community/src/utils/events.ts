import {
  EventListing,
  EventTiming,
  HomeScope,
  TimeWindow,
  filterEventsInWindow,
  getEventTiming,
  getTodayLabel,
} from '../types';

/** "10:00 PM" in the device's locale */
export const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const getTimingFor = (event: EventListing, nowMs: number): EventTiming =>
  getEventTiming(event.startsAt.toMillis(), event.endsAt.toMillis(), nowMs);

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

/** "today", "tonight", or "this week": the stretch of time the home screen is showing */
export const formatPeriod = (scope: HomeScope, now: Date): string =>
  scope === 'week' ? 'this week' : getTodayLabel(now);

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** "In 18 min · 10:00 PM", "On now · until 2:00 AM", or "Sat · 11:00 AM" */
export const formatTimingLabel = (event: EventListing, nowMs: number): string => {
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

  const start = new Date(startMs);
  if (isSameDay(start, new Date(nowMs))) {
    return formatClock(startMs);
  }
  const weekday = start.toLocaleDateString([], { weekday: 'short' });
  return `${weekday} · ${formatClock(startMs)}`;
};

/** Short form for badges: "Starts in 18 min", "On now", "10:00 PM" */
export const formatTimingBadge = (event: EventListing, nowMs: number): string => {
  const timing = getTimingFor(event, nowMs);
  if (timing.state === 'on_now') return 'On now';
  if (timing.state === 'starting_soon') return `Starts in ${timing.minutesUntilStart} min`;
  return formatTimingLabel(event, nowMs);
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
