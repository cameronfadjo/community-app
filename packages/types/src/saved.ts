/**
 * Events someone has saved to go to. The list lives on their phone and
 * nowhere else, so nobody can tell who plans to be where.
 */

import type { EventStatus } from './event';

/** Only what is needed to list the event and remind about it */
export interface SavedEvent {
  eventId: string;
  title: string;
  venueName: string;
  activityIds: string[];
  startsAtMs: number;
  endsAtMs: number;
  status: EventStatus;
  savedAtMs: number;
}

export interface SavableEvent {
  id: string;
  title: string;
  venueName: string;
  activityIds: string[];
  startsAtMs: number;
  endsAtMs: number;
  status: EventStatus;
}

const soonestFirst = (saved: SavedEvent[]): SavedEvent[] =>
  [...saved].sort((a, b) => a.startsAtMs - b.startsAtMs);

const details = (event: SavableEvent) => ({
  title: event.title,
  venueName: event.venueName,
  activityIds: event.activityIds,
  startsAtMs: event.startsAtMs,
  endsAtMs: event.endsAtMs,
  status: event.status,
});

export const isSaved = (saved: SavedEvent[], eventId: string): boolean =>
  saved.some((item) => item.eventId === eventId);

/** Saves the event, or takes it off the list if it was already saved */
export const toggleSaved = (
  saved: SavedEvent[],
  event: SavableEvent,
  nowMs: number
): SavedEvent[] =>
  isSaved(saved, event.id)
    ? saved.filter((item) => item.eventId !== event.id)
    : soonestFirst([...saved, { eventId: event.id, ...details(event), savedAtMs: nowMs }]);

/** Drops events that are over, so the list doesn't become a record of where someone has been */
export const pruneSaved = (saved: SavedEvent[], nowMs: number): SavedEvent[] =>
  saved.filter((item) => item.endsAtMs > nowMs);

/** Takes on any changes the host has made since the event was saved */
export const updateSaved = (saved: SavedEvent[], latest: SavableEvent[]): SavedEvent[] => {
  const byId = new Map(latest.map((event) => [event.id, event]));
  return soonestFirst(
    saved.map((item) => {
      const event = byId.get(item.eventId);
      return event ? { ...item, ...details(event) } : item;
    })
  );
};

/** An event the host has removed is shown as cancelled, not silently dropped */
export const markRemoved = (saved: SavedEvent[], eventIds: string[]): SavedEvent[] =>
  saved.map((item) =>
    eventIds.includes(item.eventId) ? { ...item, status: 'cancelled' as const } : item
  );

export const removeSaved = (saved: SavedEvent[], eventId: string): SavedEvent[] =>
  saved.filter((item) => item.eventId !== eventId);

/** Puts back an event that was taken off the list by mistake */
export const restoreSaved = (saved: SavedEvent[], item: SavedEvent): SavedEvent[] =>
  isSaved(saved, item.eventId) ? saved : soonestFirst([...saved, item]);
