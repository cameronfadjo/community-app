import { describe, expect, it } from 'vitest';
import {
  STARTING_SOON_MINUTES,
  MIN_EVENTS_FOR_TODAY,
  chooseHomeScope,
  countEventsByActivity,
  describeRecurrence,
  expandMonthlyRecurrence,
  filterEventsInWindow,
  formatMinimumAge,
  getTodayLabel,
  expandWeeklyRecurrence,
  formatDistanceLabel,
  getEventTiming,
  getTonightWindow,
  getWhenWindow,
  matchesEventFilters,
  rankEventsForPick,
} from './event-utils';
import {
  ACTIVITY_COLORS,
  DEFAULT_ACTIVITIES,
  RETIRED_ACTIVITY_IDS,
  activityColorForIndex,
} from './activity';

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

describe('formatMinimumAge', () => {
  it('shows the age with a plus', () => {
    expect(formatMinimumAge(18)).toBe('18+');
    expect(formatMinimumAge(21)).toBe('21+');
  });

  it('never shows an event as open to under-18s, whatever was stored', () => {
    expect(formatMinimumAge(0)).toBe('18+');
    expect(formatMinimumAge(undefined)).toBe('18+');
  });
});

describe('going-out activities', () => {
  const ids = DEFAULT_ACTIVITIES.map((a) => a.id);

  it('leaves out services, which are not somewhere to go out to', () => {
    expect(ids).not.toContain('support-groups');
    expect(RETIRED_ACTIVITY_IDS).toContain('support-groups');
  });

  it('never lists a retired activity in the starting set', () => {
    for (const retired of RETIRED_ACTIVITY_IDS) {
      expect(ids).not.toContain(retired);
    }
  });

  it('covers the events community groups and centers host', () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        'community-hangouts',
        'meetups-and-mixers',
        'tabletop-and-role-playing',
        'markets-and-fairs',
        'watch-parties',
        'theater-and-performance',
      ])
    );
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

describe('getWhenWindow', () => {
  it('uses the tonight window for tonight', () => {
    const now = new Date(2026, 8, 25, 21, 0);
    expect(getWhenWindow('tonight', now)).toEqual(getTonightWindow(now));
  });

  it('starts tomorrow when tonight ends and lasts a day', () => {
    const now = new Date(2026, 8, 25, 21, 0); // Friday
    const window = getWhenWindow('tomorrow', now);
    expect(new Date(window.startMs)).toEqual(new Date(2026, 8, 26, 4, 0));
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 27, 4, 0));
  });

  it('treats 1 AM Saturday as still Friday night when finding tomorrow', () => {
    const now = new Date(2026, 8, 26, 1, 0);
    const window = getWhenWindow('tomorrow', now);
    expect(new Date(window.startMs)).toEqual(new Date(2026, 8, 26, 4, 0));
  });

  it('runs the weekend from Friday 4 AM to Monday 4 AM when asked midweek', () => {
    const now = new Date(2026, 8, 23, 12, 0); // Wednesday
    const window = getWhenWindow('weekend', now);
    expect(new Date(window.startMs)).toEqual(new Date(2026, 8, 25, 4, 0));
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 28, 4, 0));
  });

  it('starts the weekend now when it is already under way', () => {
    const now = new Date(2026, 8, 26, 15, 0); // Saturday
    const window = getWhenWindow('weekend', now);
    expect(window.startMs).toBe(now.getTime());
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 28, 4, 0));
  });

  it('counts early Monday morning as the end of the weekend', () => {
    const now = new Date(2026, 8, 28, 2, 0); // Monday 2 AM
    const window = getWhenWindow('weekend', now);
    expect(window.startMs).toBe(now.getTime());
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 28, 4, 0));
  });
});

describe('formatDistanceLabel', () => {
  it('shows walking minutes for short distances', () => {
    expect(formatDistanceLabel(0.33)).toBe('4 min walk');
    expect(formatDistanceLabel(1)).toBe('12 min walk');
  });

  it('never says 0 min', () => {
    expect(formatDistanceLabel(0.01)).toBe('1 min walk');
  });

  it('switches to miles beyond a 30 minute walk', () => {
    expect(formatDistanceLabel(2.5)).toBe('30 min walk');
    expect(formatDistanceLabel(3.2)).toBe('2.0 mi');
    expect(formatDistanceLabel(20)).toBe('12 mi');
  });
});

describe('rankEventsForPick', () => {
  const now = new Date(2026, 8, 25, 21, 42).getTime();
  const base = {
    coverCents: 0,
    tags: {
      goodForSolo: false,
      firstTimersWelcome: false,
      alcoholFree: false,
      stepFreeEntry: false,
      minimumAge: 18 as const,
    },
  };
  const at = (minutesFromNow: number, durationMinutes = 120) => ({
    startsAtMs: now + minutesFromNow * MIN,
    endsAtMs: now + (minutesFromNow + durationMinutes) * MIN,
  });

  it('leaves out events that have ended or are about to', () => {
    const ranked = rankEventsForPick(
      [
        { id: 'over', ...base, ...at(-180, 120) },
        { id: 'closing', ...base, ...at(-100, 120) },
        { id: 'good', ...base, ...at(20) },
      ],
      now
    );
    expect(ranked.map((e) => e.id)).toEqual(['good']);
  });

  it('prefers something starting soon over something hours away', () => {
    const ranked = rankEventsForPick(
      [
        { id: 'later', ...base, ...at(200) },
        { id: 'soon', ...base, ...at(18) },
      ],
      now
    );
    expect(ranked[0]!.id).toBe('soon');
  });

  it('prefers the closer of two similar events', () => {
    const ranked = rankEventsForPick(
      [
        { id: 'far', ...base, ...at(18), distanceKm: 4 },
        { id: 'near', ...base, ...at(18), distanceKm: 0.5 },
      ],
      now
    );
    expect(ranked[0]!.id).toBe('near');
  });

  it('gives a boost for a perk, going solo, and a room that is filling up', () => {
    const ranked = rankEventsForPick(
      [
        { id: 'plain', ...base, ...at(18), distanceKm: 1 },
        {
          id: 'extras',
          ...base,
          ...at(18),
          distanceKm: 1,
          perkLabel: 'Free drink',
          busyLevel: 'filling_up' as const,
          tags: { ...base.tags, goodForSolo: true },
        },
      ],
      now
    );
    expect(ranked[0]!.id).toBe('extras');
  });

  it('returns an empty list when nothing is on', () => {
    expect(rankEventsForPick([], now)).toEqual([]);
  });
});

describe('expandMonthlyRecurrence', () => {
  it('repeats on the same numbered weekday each month', () => {
    // 3rd Saturday of September 2026
    const starts = expandMonthlyRecurrence({
      firstStartMs: new Date(2026, 8, 19, 19, 30).getTime(),
      untilMs: new Date(2026, 11, 31).getTime(),
    });
    expect(starts.map((ms) => new Date(ms))).toEqual([
      new Date(2026, 8, 19, 19, 30),
      new Date(2026, 9, 17, 19, 30),
      new Date(2026, 10, 21, 19, 30),
      new Date(2026, 11, 19, 19, 30),
    ]);
  });

  it('handles the first weekday of the month', () => {
    // 1st Tuesday of October 2026
    const starts = expandMonthlyRecurrence({
      firstStartMs: new Date(2026, 9, 6, 19, 0).getTime(),
      untilMs: new Date(2026, 11, 31).getTime(),
    });
    expect(starts.map((ms) => new Date(ms).getDate())).toEqual([6, 3, 1]);
  });

  it('treats a fifth weekday as the last one of each month', () => {
    // 5th Sunday of November 2026 is also its last Sunday
    const starts = expandMonthlyRecurrence({
      firstStartMs: new Date(2026, 10, 29, 11, 0).getTime(),
      untilMs: new Date(2027, 2, 1).getTime(),
    });
    expect(starts.map((ms) => new Date(ms))).toEqual([
      new Date(2026, 10, 29, 11, 0),
      new Date(2026, 11, 27, 11, 0),
      new Date(2027, 0, 31, 11, 0),
      new Date(2027, 1, 28, 11, 0),
    ]);
  });

  it('keeps the local time across a daylight saving change', () => {
    const starts = expandMonthlyRecurrence({
      firstStartMs: new Date(2026, 9, 17, 19, 30).getTime(),
      untilMs: new Date(2026, 11, 1).getTime(),
    });
    expect(new Date(starts[1]!).getHours()).toBe(19);
    expect(new Date(starts[1]!).getMinutes()).toBe(30);
  });

  it('caps the number of instances', () => {
    const starts = expandMonthlyRecurrence({
      firstStartMs: new Date(2026, 8, 19, 19, 30).getTime(),
      untilMs: new Date(2040, 0, 1).getTime(),
      maxInstances: 6,
    });
    expect(starts).toHaveLength(6);
  });
});

describe('expandWeeklyRecurrence every two weeks', () => {
  it('steps by the number of weeks given', () => {
    const starts = expandWeeklyRecurrence({
      firstStartMs: new Date(2026, 8, 25, 22, 0).getTime(),
      untilMs: new Date(2026, 9, 31).getTime(),
      everyWeeks: 2,
    });
    expect(starts.map((ms) => new Date(ms).getDate())).toEqual([25, 9, 23]);
  });
});

describe('describeRecurrence', () => {
  it('describes a weekly repeat', () => {
    expect(describeRecurrence(new Date(2026, 8, 25, 22, 0), 'weekly')).toBe('Every Friday');
  });

  it('describes a repeat every two weeks', () => {
    expect(describeRecurrence(new Date(2026, 8, 25, 22, 0), 'every_two_weeks')).toBe(
      'Every other Friday'
    );
  });

  it('describes a monthly repeat by its numbered weekday', () => {
    expect(describeRecurrence(new Date(2026, 8, 19, 19, 30), 'monthly')).toBe(
      'The 3rd Saturday of every month'
    );
    expect(describeRecurrence(new Date(2026, 9, 6, 19, 0), 'monthly')).toBe(
      'The 1st Tuesday of every month'
    );
  });

  it('describes a fifth weekday as the last', () => {
    expect(describeRecurrence(new Date(2026, 10, 29, 11, 0), 'monthly')).toBe(
      'The last Sunday of every month'
    );
  });
});

describe('getWhenWindow for the week', () => {
  it('runs from now until the night ends seven days later', () => {
    const now = new Date(2026, 8, 23, 12, 0);
    const window = getWhenWindow('week', now);
    expect(window.startMs).toBe(now.getTime());
    expect(new Date(window.endMs)).toEqual(new Date(2026, 8, 30, 4, 0));
  });
});

describe('filterEventsInWindow', () => {
  const window = { startMs: 1000, endMs: 2000 };

  it('keeps events that start inside the window', () => {
    expect(filterEventsInWindow([{ startsAtMs: 1500, endsAtMs: 2500 }], window)).toHaveLength(1);
  });

  it('keeps events already under way when the window opens', () => {
    expect(filterEventsInWindow([{ startsAtMs: 500, endsAtMs: 1200 }], window)).toHaveLength(1);
  });

  it('drops events that ended before the window or start after it', () => {
    const events = [
      { startsAtMs: 100, endsAtMs: 1000 },
      { startsAtMs: 2001, endsAtMs: 3000 },
    ];
    expect(filterEventsInWindow(events, window)).toEqual([]);
  });
});

describe('chooseHomeScope', () => {
  it('shows today when enough is on', () => {
    expect(chooseHomeScope(MIN_EVENTS_FOR_TODAY)).toBe('today');
  });

  it('widens to the week when today is thin', () => {
    expect(chooseHomeScope(MIN_EVENTS_FOR_TODAY - 1)).toBe('week');
    expect(chooseHomeScope(0)).toBe('week');
  });
});

describe('getTodayLabel', () => {
  it('says today during the day and tonight from the evening', () => {
    expect(getTodayLabel(new Date(2026, 8, 26, 11, 0))).toBe('today');
    expect(getTodayLabel(new Date(2026, 8, 26, 16, 59))).toBe('today');
    expect(getTodayLabel(new Date(2026, 8, 26, 17, 0))).toBe('tonight');
  });

  it('still says tonight in the small hours', () => {
    expect(getTodayLabel(new Date(2026, 8, 27, 1, 30))).toBe('tonight');
  });
});
