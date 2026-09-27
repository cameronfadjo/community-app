import { create } from 'zustand';
import { Activity, EventListing } from '../types';
import { getActivities } from '../services/api/activities';
import { Coordinates, EventWithDistance, getEvent, getEventsTonight } from '../services/api/events';
import { calculateDistance } from '../services/firebase/geolocation';
import { buildSampleActivities, buildSampleEvents } from '../data/sampleEvents';

interface EventState {
  activities: Activity[];
  tonightEvents: EventWithDistance[];
  userLocation: Coordinates | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  /** True when development sample events are being shown */
  usingSampleData: boolean;

  setUserLocation: (location: Coordinates | null) => void;
  loadTonight: () => Promise<void>;
  findEvent: (eventId: string) => Promise<EventWithDistance | null>;
  getActivity: (activityId: string) => Activity | undefined;
}

const addDistance = (events: EventListing[], near: Coordinates | null): EventWithDistance[] =>
  events.map((event) =>
    near
      ? {
          ...event,
          distanceKm: calculateDistance(
            near.latitude,
            near.longitude,
            event.location.coordinates.latitude,
            event.location.coordinates.longitude
          ),
        }
      : event
  );

// Shared by callers that ask while a load is already under way
let loadInFlight: Promise<void> | null = null;

export const useEventStore = create<EventState>((set, get) => ({
  activities: [],
  tonightEvents: [],
  userLocation: null,
  loading: false,
  loaded: false,
  error: null,
  usingSampleData: false,

  setUserLocation: (location) => {
    set({
      userLocation: location,
      tonightEvents: addDistance(get().tonightEvents, location),
    });
  },

  loadTonight: () => {
    if (loadInFlight) {
      return loadInFlight;
    }

    const load = async () => {
      set({ loading: true, error: null });
      const { userLocation } = get();

      let activities: Activity[] = [];
      let events: EventWithDistance[] = [];
      let error: string | null = null;

      try {
        [activities, events] = await Promise.all([
          getActivities(),
          getEventsTonight({}, userLocation),
        ]);
      } catch (e: any) {
        console.error('[EventStore] Error loading tonight:', e);
        error = "We couldn't load what's on. Pull down to try again.";
      }

      // The starting set stands in until the activities collection is seeded
      if (activities.length === 0) {
        activities = buildSampleActivities();
      }

      // Development only: show sample events rather than an empty app
      const usingSampleData = __DEV__ && events.length === 0;
      if (usingSampleData) {
        events = addDistance(buildSampleEvents(), userLocation);
        error = null;
      }

      set({
        activities,
        tonightEvents: events,
        loading: false,
        loaded: true,
        error,
        usingSampleData,
      });
    };

    loadInFlight = load().finally(() => {
      loadInFlight = null;
    });
    return loadInFlight;
  },

  findEvent: async (eventId) => {
    const loaded = get().tonightEvents.find((event) => event.id === eventId);
    if (loaded) {
      return loaded;
    }

    const event = await getEvent(eventId);
    return event ? addDistance([event], get().userLocation)[0] ?? null : null;
  },

  getActivity: (activityId) => get().activities.find((activity) => activity.id === activityId),
}));
