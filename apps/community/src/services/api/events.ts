import type { QueryConstraint } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  EventFilters,
  EventListing,
  TimeWindow,
  getTonightWindow,
  matchesEventFilters,
} from '../../types';
import {
  COLLECTIONS,
  readDocument,
  queryDocuments,
  where,
  orderBy,
} from '../firebase/firestore';
import { calculateDistance } from '../firebase/geolocation';

// An event that started up to this long ago may still be running
const LONGEST_EVENT_MS = 12 * 60 * 60 * 1000;

export type EventWithDistance = EventListing & { distanceKm?: number };

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Get a single event by ID
 */
export const getEvent = async (eventId: string): Promise<EventListing | null> => {
  return await readDocument<EventListing>(COLLECTIONS.EVENTS, eventId);
};

/**
 * Get events that are running or start inside the window, soonest first.
 * Events already under way are included until they end.
 */
export const getEventsInWindow = async (
  window: TimeWindow,
  filters: EventFilters = {},
  near?: Coordinates | null
): Promise<EventWithDistance[]> => {
  const constraints: QueryConstraint[] = [];

  // Firestore allows one array-contains per query, so the activity goes
  // to the server and the remaining filters run on the results
  if (filters.activityId) {
    constraints.push(where('activityIds', 'array-contains', filters.activityId));
  }

  constraints.push(
    where('status', '==', 'scheduled'),
    where('startsAt', '>=', Timestamp.fromMillis(window.startMs - LONGEST_EVENT_MS)),
    where('startsAt', '<=', Timestamp.fromMillis(window.endMs)),
    orderBy('startsAt', 'asc')
  );

  const events = await queryDocuments<EventListing>(COLLECTIONS.EVENTS, constraints);

  return events
    .filter((event) => event.endsAt.toMillis() > window.startMs)
    .filter((event) => matchesEventFilters(event, filters))
    .map((event) => withDistance(event, near));
};

/**
 * Get what's on tonight: from now until the night ends at 4 AM
 */
export const getEventsTonight = async (
  filters: EventFilters = {},
  near?: Coordinates | null
): Promise<EventWithDistance[]> => {
  return await getEventsInWindow(getTonightWindow(new Date()), filters, near);
};

const withDistance = (event: EventListing, near?: Coordinates | null): EventWithDistance => {
  if (!near) {
    return event;
  }

  const { latitude, longitude } = event.location.coordinates;
  return {
    ...event,
    distanceKm: calculateDistance(near.latitude, near.longitude, latitude, longitude),
  };
};
