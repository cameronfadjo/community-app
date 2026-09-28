import { describe, expect, it } from 'vitest';
import { MIN_EVENTS_FOR_TODAY } from './event-utils';
import {
  chooseWhen,
  coversSeveralDays,
  formatDayShort,
  formatPeriod,
  groupEventsByDay,
  isSameNight,
  resolveHomeScope,
} from './look-ahead';

describe('resolveHomeScope', () => {
  it('follows the person once they have chosen', () => {
    expect(resolveHomeScope('month', 10)).toBe('month');
    expect(resolveHomeScope('week', 10)).toBe('week');
    expect(resolveHomeScope('today', 0)).toBe('today');
  });

  it('chooses for them until then: today, or the week when today is thin', () => {
    expect(resolveHomeScope(null, MIN_EVENTS_FOR_TODAY)).toBe('today');
    expect(resolveHomeScope(null, MIN_EVENTS_FOR_TODAY - 1)).toBe('week');
  });
});

describe('groupEventsByDay', () => {
  // Friday, 3 PM
  const now = new Date(2026, 8, 25, 15, 0).getTime();
  const at = (id: string, month: number, day: number, hour: number) => ({
    id,
    startsAtMs: new Date(2026, month, day, hour).getTime(),
  });
  const ids = (groups: ReturnType<typeof groupEventsByDay<{ id: string; startsAtMs: number }>>) =>
    groups.map((group) => group.events.map((event) => event.id));

  it('puts each day under its own heading, soonest first', () => {
    const groups = groupEventsByDay(
      [at('sunday', 8, 27, 20), at('friday', 8, 25, 21), at('saturday', 8, 26, 14)],
      now
    );
    expect(groups.map((group) => group.label)).toEqual(['Today', 'Tomorrow', 'Sunday, Sep 27']);
    expect(ids(groups)).toEqual([['friday'], ['saturday'], ['sunday']]);
  });

  it('orders the events within a day by when they start', () => {
    const groups = groupEventsByDay([at('late', 8, 26, 22), at('early', 8, 26, 11)], now);
    expect(ids(groups)).toEqual([['early', 'late']]);
  });

  it('says tonight once the evening has started', () => {
    const evening = new Date(2026, 8, 25, 18, 0).getTime();
    expect(groupEventsByDay([at('friday', 8, 25, 21)], evening)[0]?.label).toBe('Tonight');
  });

  it('counts the small hours as the night before', () => {
    // 1 AM on Saturday is still Friday night
    const groups = groupEventsByDay([at('after_midnight', 8, 26, 1), at('friday', 8, 25, 22)], now);
    expect(groups.map((group) => group.label)).toEqual(['Today']);
    expect(ids(groups)).toEqual([['friday', 'after_midnight']]);
  });

  it('keeps something already under way with today', () => {
    const groups = groupEventsByDay([at('since_last_night', 8, 24, 23)], now);
    expect(groups.map((group) => group.label)).toEqual(['Today']);
  });

  it('names a day further off by its weekday and date', () => {
    const groups = groupEventsByDay([at('next_month', 9, 17, 20)], now);
    expect(groups[0]?.label).toBe('Saturday, Oct 17');
  });

  it('gives each day a key of its own', () => {
    const groups = groupEventsByDay([at('friday', 8, 25, 21), at('next_month', 9, 17, 20)], now);
    expect(groups.map((group) => group.dayKey)).toEqual(['2026-09-25', '2026-10-17']);
  });

  it('has nothing to show for no events', () => {
    expect(groupEventsByDay([], now)).toEqual([]);
  });
});

describe('formatDayShort', () => {
  // Friday, 3 PM
  const now = new Date(2026, 8, 25, 15, 0).getTime();
  const on = (month: number, day: number, hour = 20) => new Date(2026, month, day, hour).getTime();

  it('says nothing for later the same day', () => {
    expect(formatDayShort(on(8, 25), now)).toBeNull();
  });

  it('names the weekday for the next six days', () => {
    expect(formatDayShort(on(8, 26), now)).toBe('Sat');
    expect(formatDayShort(on(9, 1), now)).toBe('Thu');
  });

  it('adds the date from a week away, when the weekday alone could mean two days', () => {
    expect(formatDayShort(on(9, 2), now)).toBe('Fri, Oct 2');
    expect(formatDayShort(on(9, 17), now)).toBe('Sat, Oct 17');
  });

  it('goes by the calendar, so 1 AM tomorrow is tomorrow', () => {
    expect(formatDayShort(on(8, 26, 1), now)).toBe('Sat');
  });
});

describe('formatPeriod', () => {
  const afternoon = new Date(2026, 8, 25, 15, 0);
  const evening = new Date(2026, 8, 25, 19, 0);

  it('says today until the evening, then tonight', () => {
    expect(formatPeriod('today', afternoon)).toBe('today');
    expect(formatPeriod('today', evening)).toBe('tonight');
  });

  it('names the week and the month', () => {
    expect(formatPeriod('week', afternoon)).toBe('this week');
    expect(formatPeriod('month', evening)).toBe('this month');
  });
});

describe('chooseWhen', () => {
  it('opens a list on what the link asked for', () => {
    expect(chooseWhen('month', 'today')).toBe('month');
    expect(chooseWhen('weekend', 'month')).toBe('weekend');
  });

  it('otherwise opens on the same stretch of time as the home screen', () => {
    expect(chooseWhen(undefined, 'today')).toBe('tonight');
    expect(chooseWhen(undefined, 'week')).toBe('week');
    expect(chooseWhen(undefined, 'month')).toBe('month');
  });

  it('ignores a link asking for something that is not a choice', () => {
    expect(chooseWhen('forever', 'week')).toBe('week');
    expect(chooseWhen(['month'], 'today')).toBe('tonight');
  });
});

describe('coversSeveralDays', () => {
  it('is true for the weekend, the week, and the month, which need a heading for each day', () => {
    expect(coversSeveralDays('weekend')).toBe(true);
    expect(coversSeveralDays('week')).toBe(true);
    expect(coversSeveralDays('month')).toBe(true);
  });

  it('is false for a single day', () => {
    expect(coversSeveralDays('tonight')).toBe(false);
    expect(coversSeveralDays('tomorrow')).toBe(false);
  });
});

describe('isSameNight', () => {
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

  it('is true for two events on the same evening', () => {
    expect(isSameNight(at(6, 18), at(6, 22))).toBe(true);
  });

  it('counts the small hours with the night before', () => {
    expect(isSameNight(at(6, 23), at(7, 1))).toBe(true);
    expect(isSameNight(at(7, 1), at(7, 20))).toBe(false);
  });

  it('is false for the same time on another day', () => {
    expect(isSameNight(at(6, 20), at(7, 20))).toBe(false);
    expect(isSameNight(at(6, 20), at(13, 20))).toBe(false);
  });
});
