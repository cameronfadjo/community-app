import { describe, expect, it } from 'vitest';
import {
  isSaved,
  markRemoved,
  pruneSaved,
  removeSaved,
  restoreSaved,
  toggleSaved,
  updateSaved,
  type SavedEvent,
} from './saved';

const anEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event_1',
  title: 'Drag bingo',
  venueName: 'Chez Est',
  activityIds: ['drag-shows'],
  startsAtMs: 5000,
  endsAtMs: 9000,
  status: 'scheduled' as const,
  ...overrides,
});

const saved = (overrides: Partial<SavedEvent> = {}): SavedEvent => ({
  eventId: 'event_1',
  title: 'Drag bingo',
  venueName: 'Chez Est',
  activityIds: ['drag-shows'],
  startsAtMs: 5000,
  endsAtMs: 9000,
  status: 'scheduled',
  savedAtMs: 1000,
  ...overrides,
});

describe('toggleSaved', () => {
  it('saves an event, keeping what is needed to show it and remind about it', () => {
    expect(toggleSaved([], anEvent(), 1000)).toEqual([saved()]);
  });

  it('keeps nothing else about the event, such as its description or host', () => {
    const [kept] = toggleSaved([], anEvent({ description: 'Bring friends', organizerId: 'p1' }), 1000);
    expect(Object.keys(kept ?? {}).sort()).toEqual(Object.keys(saved()).sort());
  });

  it('takes it off the list when it was already saved', () => {
    expect(toggleSaved([saved()], anEvent(), 2000)).toEqual([]);
  });

  it('keeps the list soonest first', () => {
    const list = toggleSaved(
      [saved({ eventId: 'later', startsAtMs: 8000 })],
      anEvent({ id: 'sooner', startsAtMs: 2000 }),
      1000
    );
    expect(list.map((item) => item.eventId)).toEqual(['sooner', 'later']);
  });

  it('leaves the list it was given as it was', () => {
    const before = [saved()];
    toggleSaved(before, anEvent({ id: 'event_2' }), 1000);
    expect(before).toEqual([saved()]);
  });
});

describe('isSaved', () => {
  it('knows what is on the list', () => {
    expect(isSaved([saved()], 'event_1')).toBe(true);
    expect(isSaved([saved()], 'event_2')).toBe(false);
  });
});

describe('pruneSaved', () => {
  it('drops events that are over', () => {
    expect(pruneSaved([saved({ endsAtMs: 9000 })], 9000)).toEqual([]);
  });

  it('keeps one that is on now, or still to come', () => {
    expect(pruneSaved([saved({ startsAtMs: 5000, endsAtMs: 9000 })], 6000)).toHaveLength(1);
    expect(pruneSaved([saved({ startsAtMs: 5000, endsAtMs: 9000 })], 1000)).toHaveLength(1);
  });
});

describe('updateSaved', () => {
  it('takes on changes the host has made', () => {
    const list = updateSaved(
      [saved()],
      [anEvent({ title: 'Drag bingo night', startsAtMs: 6000, endsAtMs: 9500, status: 'cancelled' })]
    );
    expect(list).toEqual([
      saved({ title: 'Drag bingo night', startsAtMs: 6000, endsAtMs: 9500, status: 'cancelled' }),
    ]);
  });

  it('keeps when it was saved', () => {
    const [kept] = updateSaved([saved({ savedAtMs: 1234 })], [anEvent({ title: 'New name' })]);
    expect(kept?.savedAtMs).toBe(1234);
  });

  it('leaves events it has no news of as they were', () => {
    expect(updateSaved([saved()], [anEvent({ id: 'another', title: 'Other' })])).toEqual([saved()]);
  });

  it('puts the list back in order when a time moves', () => {
    const list = updateSaved(
      [saved({ eventId: 'a', startsAtMs: 2000 }), saved({ eventId: 'b', startsAtMs: 3000 })],
      [anEvent({ id: 'a', startsAtMs: 7000 })]
    );
    expect(list.map((item) => item.eventId)).toEqual(['b', 'a']);
  });
});

describe('markRemoved', () => {
  it('shows an event the host has removed as cancelled', () => {
    const list = markRemoved([saved(), saved({ eventId: 'event_2' })], ['event_2']);
    expect(list.map((item) => item.status)).toEqual(['scheduled', 'cancelled']);
  });
});

describe('removeSaved', () => {
  it('takes the event off the list', () => {
    const list = [saved(), saved({ eventId: 'event_2' })];
    expect(removeSaved(list, 'event_1')).toEqual([saved({ eventId: 'event_2' })]);
  });

  it('changes nothing when the event is not on the list', () => {
    expect(removeSaved([saved()], 'event_9')).toEqual([saved()]);
  });
});

describe('restoreSaved', () => {
  it('puts back an event taken off by mistake, just as it was', () => {
    const item = saved({ savedAtMs: 1234 });
    expect(restoreSaved([], item)).toEqual([item]);
  });

  it('keeps the list soonest first', () => {
    const list = restoreSaved(
      [saved({ eventId: 'later', startsAtMs: 8000 })],
      saved({ eventId: 'sooner', startsAtMs: 2000 })
    );
    expect(list.map((item) => item.eventId)).toEqual(['sooner', 'later']);
  });

  it('does not list an event twice when it has been saved again since', () => {
    const again = saved({ savedAtMs: 3000 });
    expect(restoreSaved([again], saved({ savedAtMs: 1000 }))).toEqual([again]);
  });
});
