import { create } from 'zustand';
import { Activity, EventListing, HomeScope, chooseHomeScope, getTonightWindow, getWhenWindow } from '../types';
import { getActivities } from '../services/api/activities';
import { Coordinates, EventWithDistance, getEvent, getEventsInWindow } from '../services/api/events';
import { eventsInWindow } from '../utils/events';
import { calculateDistance } from '../services/firebase/geolocation';
import { buildSampleActivities, buildSampleEvents } from '../data/sampleEvents';

interface EventState {
  activities: Activity[];
  /** Everything on in the next seven days, soonest first */
  weekEvents: EventWithDistance[];
  /** The part of the week that is on today, until the night ends */
  tonightEvents: EventWithDistance[];
  /** The week when today is thin, so the app is never empty for lack of a busy night */
  homeScope: HomeScope;
  /** What the home screen, the list, and the pick draw from */
  homeEvents: EventWithDistance[];
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

const splitForHome = (weekEvents: EventWithDistance[]) => {
  const tonightEvents = eventsInWindow(weekEvents, getTonightWindow(new Date()));
  const homeScope = chooseHomeScope(tonightEvents.length);
  return {
    weekEvents,
    tonightEvents,
    homeScope,
    homeEvents: homeScope === 'today' ? tonightEvents : weekEvents,
  };
};

// Shared by callers that ask while a load is already under way
let loadInFlight: Promise<void> | null = null;

export const useEventStore = create<EventState>((set, get) => ({
  activities: [],
  weekEvents: [],
  tonightEvents: [],
  homeScope: 'today',
  homeEvents: [],
  userLocation: null,
  loading: false,
  loaded: false,
  error: null,
  usingSampleData: false,

  setUserLocation: (location) => {
    set({
      userLocation: location,
      ...splitForHome(addDistance(get().weekEvents, location)),
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
          getEventsInWindow(getWhenWindow('week', new Date()), {}, userLocation),
        ]);
      } catch (e: any) {
        console.error('[EventStore] Error loading events:', e);
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
        ...splitForHome(events),
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
    const loaded = get().weekEvents.find((event) => event.id === eventId);
    if (loaded) {
      return loaded;
    }

    const event = await getEvent(eventId);
    return event ? addDistance([event], get().userLocation)[0] ?? null : null;
  },

  getActivity: (activityId) => get().activities.find((activity) => activity.id === activityId),
}));
