import { create } from 'zustand';
import {
  Activity,
  EventListing,
  HomeScope,
  chooseHomeScope,
  getTonightWindow,
  getWhenWindow,
  isStillFresh,
} from '../types';
import { getActivities } from '../services/api/activities';
import { Coordinates, EventWithDistance, getEvent, getEventsInWindow } from '../services/api/events';
import { eventsInWindow } from '../utils/events';
import { calculateDistance } from '../services/firebase/geolocation';
import { buildSampleActivities, buildSampleEvents } from '../data/sampleEvents';

// Events are loaded once and shared by every screen and by the nudges.
// Far enough ahead to cover next Thursday's lineup and the weekend after it.
export const LOOK_AHEAD_DAYS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Opening another screen within this time reuses what is already loaded
const KEEP_FOR_MS = 5 * 60 * 1000;

interface LoadOptions {
  /** Ask the server even if what is loaded is recent. Used by pull to refresh. */
  force?: boolean;
}

interface EventState {
  activities: Activity[];
  /** Everything on in the next twelve days, soonest first. Used for nudges. */
  upcomingEvents: EventWithDistance[];
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
  loadTonight: (options?: LoadOptions) => Promise<void>;
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

const splitForHome = (upcomingEvents: EventWithDistance[]) => {
  const now = new Date();
  const weekEvents = eventsInWindow(upcomingEvents, getWhenWindow('week', now));
  const tonightEvents = eventsInWindow(weekEvents, getTonightWindow(now));
  const homeScope = chooseHomeScope(tonightEvents.length);
  return {
    upcomingEvents,
    weekEvents,
    tonightEvents,
    homeScope,
    homeEvents: homeScope === 'today' ? tonightEvents : weekEvents,
  };
};

// Shared by callers that ask while a load is already under way
let loadInFlight: Promise<void> | null = null;
let loadedAtMs: number | null = null;

export const useEventStore = create<EventState>((set, get) => ({
  activities: [],
  upcomingEvents: [],
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
      ...splitForHome(addDistance(get().upcomingEvents, location)),
    });
  },

  loadTonight: ({ force = false } = {}) => {
    if (loadInFlight) {
      return loadInFlight;
    }
    if (!force && isStillFresh(loadedAtMs, Date.now(), KEEP_FOR_MS)) {
      // The day may have turned since, so work out today and the week again
      set(splitForHome(get().upcomingEvents));
      return Promise.resolve();
    }

    const load = async () => {
      set({ loading: true, error: null });
      const { userLocation } = get();

      let activities: Activity[] = [];
      let events: EventWithDistance[] = [];
      let error: string | null = null;

      try {
        [activities, events] = await Promise.all([
          getActivities({ fresh: force }),
          getEventsInWindow(
            { startMs: Date.now(), endMs: Date.now() + LOOK_AHEAD_DAYS * MS_PER_DAY },
            {},
            userLocation
          ),
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

      // A failed load is tried again next time, not remembered
      loadedAtMs = error ? null : Date.now();

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
    const loaded = get().upcomingEvents.find((event) => event.id === eventId);
    if (loaded) {
      return loaded;
    }

    const event = await getEvent(eventId);
    return event ? addDistance([event], get().userLocation)[0] ?? null : null;
  },

  getActivity: (activityId) => get().activities.find((activity) => activity.id === activityId),
}));
