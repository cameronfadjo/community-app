import { create } from 'zustand';
import {
  Activity,
  DAYS_PER_MONTH_AHEAD,
  EventListing,
  HomeScope,
  getTonightWindow,
  getWhenWindow,
  isStillFresh,
  resolveHomeScope,
} from '../types';
import { getActivities } from '../services/api/activities';
import { Coordinates, EventWithDistance, getEvent, getEventsInWindow } from '../services/api/events';
import { eventsInWindow } from '../utils/events';
import { calculateDistance } from '../services/firebase/geolocation';
import { buildSampleActivities, buildSampleEvents } from '../data/sampleEvents';

// Events are loaded once and shared by every screen and by the nudges.
// Far enough ahead to cover next Thursday's lineup and the weekend after it.
// The rest of the month is loaded only when someone asks to see it, so
// people who don't look that far ahead cost nothing extra.
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
  /** Everything loaded so far, soonest first: twelve days, or thirty once asked for */
  upcomingEvents: EventWithDistance[];
  /** How many days ahead have been loaded */
  loadedDays: number;
  /** Everything on in the next seven days, soonest first */
  weekEvents: EventWithDistance[];
  /** The part of the week that is on today, until the night ends */
  tonightEvents: EventWithDistance[];
  /** What the person picked on the home screen. Null until they pick. */
  chosenScope: HomeScope | null;
  /**
   * The stretch of time being shown. Until someone picks, it is today, or
   * the week when today is thin, so the app is never empty for lack of a
   * busy night.
   */
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
  /** Shows today, the week, or the month, loading further ahead if needed */
  chooseScope: (scope: HomeScope) => Promise<void>;
  /** Makes sure events are loaded this many days ahead */
  lookAhead: (days: number) => Promise<void>;
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

const soonestFirst = (events: EventWithDistance[]): EventWithDistance[] =>
  [...events].sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());

const splitForHome = (upcomingEvents: EventWithDistance[], chosenScope: HomeScope | null) => {
  const now = new Date();
  const monthEvents = eventsInWindow(upcomingEvents, getWhenWindow('month', now));
  const weekEvents = eventsInWindow(monthEvents, getWhenWindow('week', now));
  const tonightEvents = eventsInWindow(weekEvents, getTonightWindow(now));
  const homeScope = resolveHomeScope(chosenScope, tonightEvents.length);

  const shown = { today: tonightEvents, week: weekEvents, month: monthEvents };
  return {
    upcomingEvents,
    weekEvents,
    tonightEvents,
    chosenScope,
    homeScope,
    homeEvents: shown[homeScope],
  };
};

// Shared by callers that ask while a load is already under way
let loadInFlight: Promise<void> | null = null;
let furtherInFlight: Promise<void> | null = null;
let loadedAtMs: number | null = null;
// How far ahead to load. Grows to a month once someone asks for it.
let daysToLoad = LOOK_AHEAD_DAYS;

export const useEventStore = create<EventState>((set, get) => ({
  activities: [],
  upcomingEvents: [],
  loadedDays: 0,
  weekEvents: [],
  tonightEvents: [],
  chosenScope: null,
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
      ...splitForHome(addDistance(get().upcomingEvents, location), get().chosenScope),
    });
  },

  loadTonight: ({ force = false } = {}) => {
    if (loadInFlight) {
      return loadInFlight;
    }
    if (!force && isStillFresh(loadedAtMs, Date.now(), KEEP_FOR_MS)) {
      // The day may have turned since, so work out today and the week again
      set(splitForHome(get().upcomingEvents, get().chosenScope));
      return Promise.resolve();
    }

    const load = async () => {
      set({ loading: true, error: null });
      const { userLocation } = get();
      // Fixed now, so being asked for more while this loads can't be
      // mistaken for having loaded it
      const days = daysToLoad;

      let activities: Activity[] = [];
      let events: EventWithDistance[] = [];
      let error: string | null = null;

      try {
        [activities, events] = await Promise.all([
          getActivities({ fresh: force }),
          getEventsInWindow(
            { startMs: Date.now(), endMs: Date.now() + days * MS_PER_DAY },
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
        ...splitForHome(events, get().chosenScope),
        loadedDays: error ? 0 : days,
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

  chooseScope: async (scope) => {
    set(splitForHome(get().upcomingEvents, scope));
    if (scope === 'month') {
      await get().lookAhead(DAYS_PER_MONTH_AHEAD);
    }
  },

  lookAhead: async (days) => {
    // Remembered, so pulling down to refresh loads this far as well
    daysToLoad = Math.max(daysToLoad, days);

    // Wait for anything under way, or start the first load
    if (loadInFlight || !get().loaded) {
      await get().loadTonight();
    }
    if (furtherInFlight) {
      await furtherInFlight;
    }

    const { loadedDays, usingSampleData, userLocation } = get();
    if (days <= loadedDays) {
      return;
    }

    // Sample events are all in hand already
    if (usingSampleData) {
      set({ loadedDays: days });
      return;
    }

    const loadFurther = async () => {
      set({ loading: true, error: null });
      try {
        // Only the days not yet loaded
        const further = await getEventsInWindow(
          {
            startMs: Date.now() + loadedDays * MS_PER_DAY,
            endMs: Date.now() + days * MS_PER_DAY,
          },
          {},
          userLocation
        );
        const known = new Set(get().upcomingEvents.map((event) => event.id));
        const merged = soonestFirst([
          ...get().upcomingEvents,
          ...further.filter((event) => !known.has(event.id)),
        ]);
        set({ ...splitForHome(merged, get().chosenScope), loadedDays: days, loading: false });
      } catch (e) {
        console.error('[EventStore] Error loading further ahead:', e);
        set({
          loading: false,
          error: "We couldn't load further ahead. Pull down to try again.",
        });
      }
    };

    furtherInFlight = loadFurther().finally(() => {
      furtherInFlight = null;
    });
    await furtherInFlight;
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
