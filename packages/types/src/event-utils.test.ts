import { describe, expect, it } from 'vitest';
import {
  STARTING_SOON_MINUTES,
  countEventsByActivity,
  expandWeeklyRecurrence,
  getEventTiming,
  getTonightWindow,
  matchesEventFilters,
} from './event-utils';
import { ACTIVITY_COLORS, DEFAULT_ACTIVITIES, activityColorForIndex } from './activity';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe('getEventTiming', () => {
  const start = new Date(2026, 8, 25, 22, 0).getTime(); // Fri 10:00 PM local
  const end = start + 2 * HOUR;

  it('is upcoming when the start is more than an hour away', () => {
    const timing = getEventTiming(start, end, start - 3 * HOUR);
    expect(timing).toEqual({ state: 'upcoming', minutesUntilStart: 180 });
  });

  it('is starting soon inside the threshold', () => {
    const timing = getEventTiming(start, end, start - 18 * MIN);
    expect(timing).toEqual({ state: 'starting_soon', minutesUntilStart: 18 });
  });

  it('treats exactly the threshold as starting soon', () => {
    const timing = getEventTiming(start, end, start - STARTING_SOON_MINUTES * MIN);
    expect(timing.state).toBe('starting_soon');
  });

  it('rounds partial minutes up so it never says 0 min before the start', () => {
    const timing = getEventTiming(start, end, start - 30 * 1000);
    expect(timing).toEqual({ state: 'starting_soon', minutesUntilStart: 1 });
  });

  it('is on now from the start until the end', () => {
    expect(getEventTiming(start, end, start).state).toBe('on_now');
    expect(getEventTiming(start, end, end - 1).state).toBe('on_now');
  });

  it('is ended at the end time', () => {
    expect(getEventTiming(start, end, end)).toEqual({ state: 'ended', minutesUntilStart: 0 });
  });
});

describe('getTonightWindow', () => {
  it('runs from now until 4 AM the next morning', () => {
    const now = new Date(2026, 8, 25, 21, 42);
    const window = getTonightWindow(now);
    expect(window.startMs).toBe(now.getTime());
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 26, 4, 0));
  });

  it('still counts as the same night after midnight', () => {
    const now = new Date(2026, 8, 26, 1, 30);
    const window = getTonightWindow(now);
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 26, 4, 0));
  });

  it('rolls to the next night at 4 AM', () => {
    const now = new Date(2026, 8, 26, 4, 0);
    const window = getTonightWindow(now);
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 27, 4, 0));
  });
});

describe('expandWeeklyRecurrence', () => {
  const firstStart = new Date(2026, 8, 25, 22, 0); // Friday

  it('repeats on the same weekday and local time', () => {
    const starts = expandWeeklyRecurrence({
      firstStartMs: firstStart.getTime(),
      untilMs: new Date(2026, 9, 16, 23, 59).getTime(),
    });
    expect(starts.map((ms) => new Date(ms))).toEqual([
      new Date(2026, 8, 25, 22, 0),
      new Date(2026, 9, 2, 22, 0),
      new Date(2026, 9, 9, 22, 0),
      new Date(2026, 9, 16, 22, 0),
    ]);
  });

  it('keeps the local time across a daylight saving change', () => {
    const starts = expandWeeklyRecurrence({
      firstStartMs: new Date(2026, 9, 30, 22, 0).getTime(),
      untilMs: new Date(2026, 10, 6, 23, 59).getTime(),
    });
    expect(new Date(starts[1]!).getHours()).toBe(22);
  });

  it('caps the number of instances', () => {
    const starts = expandWeeklyRecurrence({
      firstStartMs: firstStart.getTime(),
      untilMs: new Date(2030, 0, 1).getTime(),
      maxInstances: 5,
    });
    expect(starts).toHaveLength(5);
  });

  it('returns only the first event when the end date is before it', () => {
    const starts = expandWeeklyRecurrence({
      firstStartMs: firstStart.getTime(),
      untilMs: firstStart.getTime() - HOUR,
    });
    expect(starts).toEqual([firstStart.getTime()]);
  });
});

describe('activities', () => {
  it('cycles through the six palette colors', () => {
    expect(activityColorForIndex(0)).toBe(ACTIVITY_COLORS[0]);
    expect(activityColorForIndex(6)).toBe(ACTIVITY_COLORS[0]);
    expect(activityColorForIndex(7)).toBe(ACTIVITY_COLORS[1]);
  });

  it('ships a wide default list with unique ids and valid colors', () => {
    expect(DEFAULT_ACTIVITIES.length).toBeGreaterThanOrEqual(20);
    const ids = DEFAULT_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const activity of DEFAULT_ACTIVITIES) {
      expect(activity.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ACTIVITY_COLORS).toContain(activity.color);
    }
  });
});

describe('matchesEventFilters', () => {
  const event = {
    activityIds: ['drag-shows', 'dancing'],
    coverCents: 1000,
    tags: {
      goodForSolo: true,
      firstTimersWelcome: false,
      alcoholFree: false,
      stepFreeEntry: true,
      minimumAge: 21 as const,
    },
  };

  it('matches when no filters are set', () => {
    expect(matchesEventFilters(event, {})).toBe(true);
  });

  it('matches any of the event activities', () => {
    expect(matchesEventFilters(event, { activityId: 'dancing' })).toBe(true);
    expect(matchesEventFilters(event, { activityId: 'karaoke' })).toBe(false);
  });

  it('requires every selected filter to hold', () => {
    expect(matchesEventFilters(event, { goodForSolo: true, stepFreeEntry: true })).toBe(true);
    expect(matchesEventFilters(event, { goodForSolo: true, alcoholFree: true })).toBe(false);
  });

  it('treats free entry as a zero cover', () => {
    expect(matchesEventFilters(event, { freeEntry: true })).toBe(false);
    expect(matchesEventFilters({ ...event, coverCents: 0 }, { freeEntry: true })).toBe(true);
  });

  it('hides 21+ events from someone filtering for 18+', () => {
    expect(matchesEventFilters(event, { admitsAge: 18 })).toBe(false);
    expect(matchesEventFilters(event, { admitsAge: 21 })).toBe(true);
  });

  it('ignores filters that are switched off', () => {
    expect(matchesEventFilters(event, { alcoholFree: false })).toBe(true);
  });
});

describe('countEventsByActivity', () => {
  it('counts an event once under each of its activities', () => {
    const counts = countEventsByActivity([
      { activityIds: ['drag-shows', 'dancing'] },
      { activityIds: ['dancing'] },
    ]);
    expect(counts).toEqual({ 'drag-shows': 1, dancing: 2 });
  });

  it('returns an empty object when there are no events', () => {
    expect(countEventsByActivity([])).toEqual({});
  });
});
