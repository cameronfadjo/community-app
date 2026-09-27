import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPrefs,
  PlanEvent,
  PlannedNotification,
  buildNotificationPlan,
} from '../types';
import { EventWithDistance, getEventsInWindow } from '../services/api/events';
import {
  cancelScheduledNotifications,
  hasNotificationPermission,
  scheduleNotifications,
} from '../services/notifications';
import { useEventStore } from './eventStore';

// Kept on the phone only
const STORAGE_KEY = 'community.notificationPrefs';

// Far enough ahead to cover next Thursday's lineup and the weekend after it
const LOOK_AHEAD_DAYS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface NotificationState {
  prefs: NotificationPrefs;
  /** What is currently scheduled, soonest first */
  plan: PlannedNotification[];
  loaded: boolean;

  load: () => Promise<void>;
  update: (changes: Partial<NotificationPrefs>) => Promise<void>;
  reschedule: () => Promise<void>;
}

const toPlanEvent = (event: EventWithDistance): PlanEvent => ({
  id: event.id,
  title: event.title,
  venueName: event.venueName,
  activityIds: event.activityIds,
  startsAtMs: event.startsAt.toMillis(),
  endsAtMs: event.endsAt.toMillis(),
  status: event.status,
  distanceKm: event.distanceKm,
  perkLabel: event.perkLabel,
});

const loadUpcomingEvents = async (): Promise<EventWithDistance[]> => {
  // Activities and the sample-data flag come from the first load
  if (!useEventStore.getState().loaded) {
    await useEventStore.getState().loadTonight();
  }

  const { usingSampleData, tonightEvents, userLocation } = useEventStore.getState();
  if (usingSampleData) {
    return tonightEvents;
  }

  const nowMs = Date.now();
  return await getEventsInWindow(
    { startMs: nowMs, endMs: nowMs + LOOK_AHEAD_DAYS * MS_PER_DAY },
    {},
    userLocation
  );
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  prefs: DEFAULT_NOTIFICATION_PREFS,
  plan: [],
  loaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        set({ prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(saved) } });
      }
    } catch (e) {
      console.error('[Notifications] Error reading preferences:', e);
    }
    set({ loaded: true });
  },

  update: async (changes) => {
    const prefs = { ...get().prefs, ...changes };
    set({ prefs });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('[Notifications] Error saving preferences:', e);
    }

    await get().reschedule();
  },

  // Runs when the app opens and whenever preferences change, so cancelled
  // or edited events drop out of what is scheduled
  reschedule: async () => {
    const { prefs } = get();

    if (!prefs.enabled) {
      set({ plan: [] });
      await cancelScheduledNotifications();
      return;
    }

    try {
      const events = await loadUpcomingEvents();
      const activityLabels = Object.fromEntries(
        useEventStore.getState().activities.map((activity) => [activity.id, activity.label])
      );

      const plan = buildNotificationPlan({
        events: events.map(toPlanEvent),
        prefs,
        activityLabels,
        nowMs: Date.now(),
      });
      set({ plan });

      if (await hasNotificationPermission()) {
        await scheduleNotifications(plan);
      }
    } catch (e) {
      console.error('[Notifications] Error scheduling:', e);
    }
  },
}));
