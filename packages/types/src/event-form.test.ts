import { describe, expect, it } from 'vitest';
import {
  MAX_ACTIVITIES_PER_EVENT,
  MAX_EVENT_HOURS,
  buildEventOccurrences,
  parseCoverToCents,
  resolveEventTimes,
  validateEventForm,
} from './event-form';
import type { MinimumAge } from './event';
import type { EventFormData } from './event';

const HOUR = 60 * 60 * 1000;

const validForm = (overrides: Partial<EventFormData> = {}): EventFormData => ({
  title: 'Friday drag show',
  description: 'A one-hour show, then dancing.',
  activityIds: ['drag-shows'],
  venueId: 'venue_1',
  startsAt: new Date(2026, 9, 2, 22, 0),
  endsAt: new Date(2026, 9, 3, 2, 0),
  coverCents: 1000,
  images: [],
  tags: {
    goodForSolo: true,
    firstTimersWelcome: false,
    alcoholFree: false,
    stepFreeEntry: false,
    minimumAge: 21,
  },
  audience: [],
  repeat: 'none',
  ...overrides,
});

const now = new Date(2026, 8, 27, 12, 0).getTime();

describe('resolveEventTimes', () => {
  it('combines a date with start and end times', () => {
    const times = resolveEventTimes('2026-10-02', '19:30', '21:00');
    expect(times.startsAt).toEqual(new Date(2026, 9, 2, 19, 30));
    expect(times.endsAt).toEqual(new Date(2026, 9, 2, 21, 0));
  });

  it('rolls the end into the next day when it is past midnight', () => {
    const times = resolveEventTimes('2026-10-02', '22:00', '02:00');
    expect(times.endsAt).toEqual(new Date(2026, 9, 3, 2, 0));
  });

  it('treats equal start and end as a full day later, which validation rejects', () => {
    const times = resolveEventTimes('2026-10-02', '22:00', '22:00');
    expect(times.endsAt.getTime() - times.startsAt.getTime()).toBe(24 * HOUR);
  });

  it('returns null for incomplete input', () => {
    expect(resolveEventTimes('', '22:00', '23:00')).toBeNull();
    expect(resolveEventTimes('2026-10-02', '', '23:00')).toBeNull();
  });
});

describe('parseCoverToCents', () => {
  it('reads dollars, with or without a dollar sign', () => {
    expect(parseCoverToCents('10')).toBe(1000);
    expect(parseCoverToCents('$12.50')).toBe(1250);
  });

  it('treats blank and "free" as no cover', () => {
    expect(parseCoverToCents('')).toBe(0);
    expect(parseCoverToCents(' Free ')).toBe(0);
  });

  it('returns null for anything else', () => {
    expect(parseCoverToCents('ten dollars')).toBeNull();
    expect(parseCoverToCents('-5')).toBeNull();
  });
});

describe('validateEventForm', () => {
  it('accepts a complete form', () => {
    expect(validateEventForm(validForm(), now)).toEqual({});
  });

  it('requires a title, description, activity, and venue', () => {
    const errors = validateEventForm(
      validForm({ title: '  ', description: '', activityIds: [], venueId: '' }),
      now
    );
    expect(Object.keys(errors).sort()).toEqual(['activityIds', 'description', 'title', 'venueId']);
  });

  it('limits how many activities one event can claim', () => {
    const activityIds = Array.from({ length: MAX_ACTIVITIES_PER_EVENT + 1 }, (_, i) => `a${i}`);
    expect(validateEventForm(validForm({ activityIds }), now).activityIds).toBeDefined();
  });

  it('rejects an event that starts in the past', () => {
    const errors = validateEventForm(
      validForm({ startsAt: new Date(now - HOUR), endsAt: new Date(now + HOUR) }),
      now
    );
    expect(errors.startsAt).toBeDefined();
  });

  it('allows a past start when editing an existing event', () => {
    const errors = validateEventForm(
      validForm({ startsAt: new Date(now - HOUR), endsAt: new Date(now + HOUR) }),
      now,
      { isEditing: true }
    );
    expect(errors.startsAt).toBeUndefined();
  });

  it('rejects an end that is not after the start', () => {
    const start = new Date(2026, 9, 2, 22, 0);
    expect(validateEventForm(validForm({ startsAt: start, endsAt: start }), now).endsAt).toBeDefined();
  });

  it('rejects an event longer than the limit', () => {
    const start = new Date(2026, 9, 2, 10, 0);
    const end = new Date(start.getTime() + (MAX_EVENT_HOURS + 1) * HOUR);
    expect(validateEventForm(validForm({ startsAt: start, endsAt: end }), now).endsAt).toBeDefined();
  });

  it('rejects a ticket link that is not a web address', () => {
    expect(validateEventForm(validForm({ ticketUrl: 'tickets' }), now).ticketUrl).toBeDefined();
    expect(
      validateEventForm(validForm({ ticketUrl: 'https://example.com/t' }), now).ticketUrl
    ).toBeUndefined();
  });

  it('rejects a repeat end date before the first event', () => {
    const errors = validateEventForm(
      validForm({ repeat: 'weekly', repeatUntil: new Date(2026, 9, 1) }),
      now
    );
    expect(errors.repeatUntil).toBeDefined();
  });
});

describe('buildEventOccurrences', () => {
  it('builds one occurrence with no series when the event does not repeat', () => {
    const occurrences = buildEventOccurrences(validForm(), () => 'series_1');
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toEqual({
      startsAtMs: new Date(2026, 9, 2, 22, 0).getTime(),
      endsAtMs: new Date(2026, 9, 3, 2, 0).getTime(),
      seriesId: undefined,
    });
  });

  it('builds weekly occurrences that share a series and keep their length', () => {
    const occurrences = buildEventOccurrences(
      validForm({ repeat: 'weekly', repeatUntil: new Date(2026, 9, 16) }),
      () => 'series_1'
    );
    expect(occurrences.map((o) => new Date(o.startsAtMs))).toEqual([
      new Date(2026, 9, 2, 22, 0),
      new Date(2026, 9, 9, 22, 0),
      new Date(2026, 9, 16, 22, 0),
    ]);
    expect(occurrences.every((o) => o.seriesId === 'series_1')).toBe(true);
    expect(occurrences.every((o) => o.endsAtMs - o.startsAtMs === 4 * HOUR)).toBe(true);
  });

  it('builds monthly occurrences on the same numbered weekday', () => {
    // The form's start is the 1st Friday of October 2026
    const occurrences = buildEventOccurrences(
      validForm({ repeat: 'monthly', repeatUntil: new Date(2026, 11, 31) }),
      () => 'series_1'
    );
    expect(occurrences.map((o) => new Date(o.startsAtMs))).toEqual([
      new Date(2026, 9, 2, 22, 0),
      new Date(2026, 10, 6, 22, 0),
      new Date(2026, 11, 4, 22, 0),
    ]);
    expect(occurrences.every((o) => o.seriesId === 'series_1')).toBe(true);
  });

  it('accepts events for 18 and over or 21 and over', () => {
    for (const minimumAge of [18, 21] as const) {
      const form = validForm({ tags: { ...validForm().tags, minimumAge } });
      expect(validateEventForm(form, now).tags).toBeUndefined();
    }
  });

  it('turns away events open to under-18s', () => {
    for (const minimumAge of [0, 13, 17]) {
      const form = validForm({
        tags: { ...validForm().tags, minimumAge: minimumAge as unknown as MinimumAge },
      });
      expect(validateEventForm(form, now).tags).toBe('Events must be for people 18 and over.');
    }
  });

  it('asks for an end date when the event repeats', () => {
    expect(validateEventForm(validForm({ repeat: 'monthly' }), now).repeatUntil).toBeDefined();
  });

  it('includes an event on the last day of the repeat, whatever the time', () => {
    // The date picker gives midnight; a 10 PM event that day still counts
    const occurrences = buildEventOccurrences(
      validForm({ repeat: 'weekly', repeatUntil: new Date(2026, 9, 9, 0, 0) }),
      () => 'series_1'
    );
    expect(occurrences).toHaveLength(2);
  });
});
