import { describe, expect, it } from 'vitest';
import {
  MAX_PLANNED_NOTIFICATIONS,
  MAX_STARTING_SOON_PER_NIGHT,
  buildNotificationPlan,
  getNextLineupTime,
  type NotificationPrefs,
  type PlanEvent,
} from './notification-plan';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Wednesday, Sept 23 2026, noon
const now = new Date(2026, 8, 23, 12, 0).getTime();

const prefs = (overrides: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  enabled: true,
  startingSoon: true,
  weekendLineup: true,
  discreet: false,
  activityIds: [],
  ...overrides,
});

const event = (overrides: Partial<PlanEvent> = {}): PlanEvent => ({
  id: 'e1',
  title: 'Friday drag show',
  venueName: 'The Stud',
  activityIds: ['drag-shows'],
  startsAtMs: new Date(2026, 8, 25, 22, 0).getTime(),
  endsAtMs: new Date(2026, 8, 26, 2, 0).getTime(),
  status: 'scheduled',
  ...overrides,
});

const labels = { 'drag-shows': 'Drag shows', dancing: 'Dancing', karaoke: 'Karaoke' };

const plan = (events: PlanEvent[], p = prefs(), nowMs = now) =>
  buildNotificationPlan({ events, prefs: p, activityLabels: labels, nowMs });

describe('getNextLineupTime', () => {
  it('is the coming Thursday at 5 PM', () => {
    expect(new Date(getNextLineupTime(now))).toEqual(new Date(2026, 8, 24, 17, 0));
  });

  it('is today when it is Thursday before 5 PM', () => {
    const thursdayMorning = new Date(2026, 8, 24, 9, 0).getTime();
    expect(new Date(getNextLineupTime(thursdayMorning))).toEqual(new Date(2026, 8, 24, 17, 0));
  });

  it('moves to next week once Thursday 5 PM has passed', () => {
    const thursdayEvening = new Date(2026, 8, 24, 17, 0).getTime();
    expect(new Date(getNextLineupTime(thursdayEvening))).toEqual(new Date(2026, 9, 1, 17, 0));
  });
});

describe('buildNotificationPlan', () => {
  it('plans nothing when notifications are off', () => {
    expect(plan([event()], prefs({ enabled: false }))).toEqual([]);
  });

  it('nudges an hour before an event starts', () => {
    const planned = plan([event()], prefs({ weekendLineup: false }));
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      kind: 'starting_soon',
      eventId: 'e1',
      fireAtMs: event().startsAtMs - HOUR,
      title: 'Friday drag show starts in an hour',
    });
    expect(planned[0]!.body).toContain('The Stud');
  });

  it('mentions the walk and the perk when it knows them', () => {
    const planned = plan(
      [event({ distanceKm: 1, perkLabel: 'Free drink' })],
      prefs({ weekendLineup: false })
    );
    expect(planned[0]!.body).toBe('The Stud · 12 min walk · Free drink when you arrive');
  });

  it('skips events that are too soon to give an hour of notice', () => {
    const soon = event({ startsAtMs: now + 30 * MIN, endsAtMs: now + 3 * HOUR });
    expect(plan([soon], prefs({ weekendLineup: false }))).toEqual([]);
  });

  it('skips cancelled events', () => {
    expect(plan([event({ status: 'cancelled' })], prefs({ weekendLineup: false }))).toEqual([]);
  });

  it('only nudges for chosen activities, when any are chosen', () => {
    const p = prefs({ weekendLineup: false, activityIds: ['karaoke'] });
    expect(plan([event()], p)).toEqual([]);
    expect(plan([event({ activityIds: ['karaoke', 'dancing'] })], p)).toHaveLength(1);
  });

  it('skips events that are too far away', () => {
    expect(plan([event({ distanceKm: 40 })], prefs({ weekendLineup: false }))).toEqual([]);
  });

  it('limits nudges per night, keeping the closest', () => {
    const events = [0.5, 3, 1, 2].map((distanceKm, index) =>
      event({ id: `e${index}`, distanceKm, startsAtMs: event().startsAtMs + index * 10 * MIN })
    );
    const planned = plan(events, prefs({ weekendLineup: false }));
    expect(planned).toHaveLength(MAX_STARTING_SOON_PER_NIGHT);
    expect(planned.map((n) => n.eventId).sort()).toEqual(['e0', 'e2']);
  });

  it('counts an event after midnight as part of the night before', () => {
    const friday = event({ id: 'a', distanceKm: 1 });
    const fridayLate = event({
      id: 'b',
      distanceKm: 2,
      startsAtMs: new Date(2026, 8, 26, 1, 30).getTime(),
      endsAtMs: new Date(2026, 8, 26, 3, 30).getTime(),
    });
    const alsoFriday = event({ id: 'c', distanceKm: 3, startsAtMs: event().startsAtMs + HOUR });
    const planned = plan([friday, fridayLate, alsoFriday], prefs({ weekendLineup: false }));
    expect(planned.map((n) => n.eventId)).toEqual(['a', 'b']);
  });

  it('sends the weekend lineup on Thursday with a count and the top activities', () => {
    const events = [
      event({ id: 'a' }),
      event({ id: 'b', activityIds: ['dancing'] }),
      event({ id: 'c', activityIds: ['drag-shows', 'dancing'] }),
      // The following Tuesday: not part of the weekend
      event({ id: 'd', startsAtMs: new Date(2026, 8, 29, 20, 0).getTime() }),
    ];
    const planned = plan(events, prefs({ startingSoon: false }));
    expect(planned).toEqual([
      {
        id: 'weekend_lineup',
        kind: 'weekend_lineup',
        fireAtMs: new Date(2026, 8, 24, 17, 0).getTime(),
        title: '3 things on this weekend',
        body: 'Drag shows and Dancing near you',
      },
    ]);
  });

  it('says "1 thing" for a single event', () => {
    const planned = plan([event()], prefs({ startingSoon: false }));
    expect(planned[0]!.title).toBe('1 thing on this weekend');
  });

  it('skips the lineup when nothing is on', () => {
    expect(plan([], prefs({ startingSoon: false }))).toEqual([]);
  });

  it('hides names in discreet mode', () => {
    const planned = plan([event({ perkLabel: 'Free drink' })], prefs({ discreet: true }));
    for (const notification of planned) {
      const text = `${notification.title} ${notification.body}`;
      expect(text).not.toMatch(/drag|Stud|drink/i);
    }
    expect(planned).toHaveLength(2);
  });

  it('returns notifications in the order they fire, within the cap', () => {
    const events = Array.from({ length: 40 }, (_, index) =>
      event({
        id: `e${index}`,
        startsAtMs: now + (index + 1) * 12 * HOUR,
        endsAtMs: now + (index + 1) * 12 * HOUR + 2 * HOUR,
      })
    );
    const planned = plan(events);
    expect(planned.length).toBeLessThanOrEqual(MAX_PLANNED_NOTIFICATIONS);
    const times = planned.map((n) => n.fireAtMs);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
