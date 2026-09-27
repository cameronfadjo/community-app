import { describe, expect, it } from 'vitest';
import {
  MIN_FOR_BREAKDOWN,
  PERK_RECORD_KEPT_DAYS,
  buildFunnel,
  canShowBreakdown,
  getSignalFields,
  getPerkRecordDeleteAtMs,
  markCounted,
  rollUpByVenue,
  shouldCount,
  summarizeSignals,
  toDayKey,
  toHourField,
  type SignalDay,
} from './signals';

const day = (overrides: Partial<SignalDay> = {}): SignalDay => ({
  eventId: 'event_1',
  day: '2026-09-25',
  ...overrides,
});

describe('toDayKey and toHourField', () => {
  it('uses the local day and hour, padded', () => {
    const when = new Date(2026, 8, 5, 7, 30);
    expect(toDayKey(when)).toBe('2026-09-05');
    expect(toHourField(when)).toBe('h07');
    expect(toHourField(new Date(2026, 8, 5, 23, 59))).toBe('h23');
  });
});

describe('getSignalFields', () => {
  const when = new Date(2026, 8, 25, 20, 15);

  it('adds a view to the total and to its hour', () => {
    expect(getSignalFields('view', when)).toEqual(['views', 'h20']);
  });

  it('adds the others to their total only', () => {
    expect(getSignalFields('directions', when)).toEqual(['directions']);
    expect(getSignalFields('perkView', when)).toEqual(['perkViews']);
  });
});

describe('counting once per phone, per event, per day', () => {
  const empty = { day: '2026-09-25', counted: [] };

  it('counts the first time', () => {
    expect(shouldCount(empty, 'event_1', 'view', '2026-09-25')).toBe(true);
  });

  it('does not count the same thing again that day', () => {
    const seen = markCounted(empty, 'event_1', 'view', '2026-09-25');
    expect(shouldCount(seen, 'event_1', 'view', '2026-09-25')).toBe(false);
  });

  it('counts a different kind or a different event', () => {
    const seen = markCounted(empty, 'event_1', 'view', '2026-09-25');
    expect(shouldCount(seen, 'event_1', 'directions', '2026-09-25')).toBe(true);
    expect(shouldCount(seen, 'event_2', 'view', '2026-09-25')).toBe(true);
  });

  it('starts again the next day, and forgets the day before', () => {
    const seen = markCounted(empty, 'event_1', 'view', '2026-09-25');
    expect(shouldCount(seen, 'event_1', 'view', '2026-09-26')).toBe(true);
    expect(markCounted(seen, 'event_2', 'view', '2026-09-26')).toEqual({
      day: '2026-09-26',
      counted: ['event_2:view'],
    });
  });

  it('never counts sample events', () => {
    expect(shouldCount(empty, 'sample_event_drag_show', 'view', '2026-09-25')).toBe(false);
  });
});

describe('summarizeSignals', () => {
  it('adds up the days', () => {
    const summary = summarizeSignals([
      day({ views: 3, directions: 1, h20: 2, h21: 1 }),
      day({ day: '2026-09-26', views: 4, perkViews: 2, h20: 4 }),
    ]);
    expect(summary.views).toBe(7);
    expect(summary.directions).toBe(1);
    expect(summary.perkViews).toBe(2);
    expect(summary.byDay).toEqual([
      { day: '2026-09-25', views: 3 },
      { day: '2026-09-26', views: 4 },
    ]);
    expect(summary.byHour[20]).toBe(6);
    expect(summary.byHour[21]).toBe(1);
    expect(summary.byHour).toHaveLength(24);
  });

  it('is all zeros when nothing has been counted', () => {
    const summary = summarizeSignals([]);
    expect(summary).toMatchObject({ views: 0, directions: 0, perkViews: 0, byDay: [] });
    expect(summary.byHour.every((count) => count === 0)).toBe(true);
  });

  it('ignores anything that is not a whole number of at least zero', () => {
    const summary = summarizeSignals([
      day({ views: -4 as number, directions: 1.5 as number, h20: 'x' as unknown as number }),
    ]);
    expect(summary).toMatchObject({ views: 0, directions: 0 });
    expect(summary.byHour[20]).toBe(0);
  });
});

describe('canShowBreakdown', () => {
  it('holds back when and where until there are enough views', () => {
    expect(canShowBreakdown(MIN_FOR_BREAKDOWN - 1)).toBe(false);
    expect(canShowBreakdown(MIN_FOR_BREAKDOWN)).toBe(true);
    expect(MIN_FOR_BREAKDOWN).toBe(5);
  });
});

describe('buildFunnel', () => {
  it('lists the steps from seeing the event to using the perk', () => {
    expect(
      buildFunnel({ views: 40, directions: 12, perkViews: 9, perkUnlocked: 6, perkRedeemed: 5 })
    ).toEqual([
      { step: 'Viewed the event', count: 40 },
      { step: 'Asked for directions', count: 12 },
      { step: 'Went for the perk', count: 9 },
      { step: 'Unlocked the perk at the door', count: 6 },
      { step: 'Used the perk', count: 5 },
    ]);
  });

  it('leaves out the perk steps for an event with no perk', () => {
    expect(buildFunnel({ views: 40, directions: 12, hasPerk: false })).toEqual([
      { step: 'Viewed the event', count: 40 },
      { step: 'Asked for directions', count: 12 },
    ]);
  });
});

describe('rollUpByVenue', () => {
  it('adds up each venue, busiest first', () => {
    expect(
      rollUpByVenue([
        { venueId: 'a', venueName: 'Chez Est', views: 3, directions: 1, perkViews: 0, perkUnlocked: 0, perkRedeemed: 0 },
        { venueId: 'b', venueName: 'Troupe429', views: 9, directions: 2, perkViews: 1, perkUnlocked: 1, perkRedeemed: 1 },
        { venueId: 'a', venueName: 'Chez Est', views: 4, directions: 0, perkViews: 2, perkUnlocked: 1, perkRedeemed: 0 },
      ])
    ).toEqual([
      { venueId: 'b', venueName: 'Troupe429', events: 1, views: 9, directions: 2, perkViews: 1, perkUnlocked: 1, perkRedeemed: 1 },
      { venueId: 'a', venueName: 'Chez Est', events: 2, views: 7, directions: 1, perkViews: 2, perkUnlocked: 1, perkRedeemed: 0 },
    ]);
  });
});

describe('getPerkRecordDeleteAtMs', () => {
  it('is thirty days after the event ends', () => {
    const endsAtMs = new Date(2026, 8, 26, 2, 0).getTime();
    expect(PERK_RECORD_KEPT_DAYS).toBe(30);
    expect(getPerkRecordDeleteAtMs(endsAtMs)).toBe(endsAtMs + 30 * 24 * 60 * 60 * 1000);
  });
});
