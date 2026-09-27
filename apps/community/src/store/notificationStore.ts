import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPrefs,
  PlanEvent,
  PlannedNotification,
  buildNotificationPlan,
} from '../types';
import { EventWithDistance } from '../services/api/events';
import {
  cancelScheduledNotifications,
  hasNotificationPermission,
  scheduleNotifications,
} from '../services/notifications';
import { useEventStore } from './eventStore';

// Kept on the phone only
const STORAGE_KEY = 'community.notificationPrefs';

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

// Uses the events the screens have already loaded, so nudges cost no
// extra reads
const loadUpcomingEvents = async (): Promise<EventWithDistance[]> => {
  await useEventStore.getState().loadTonight();
  return useEventStore.getState().upcomingEvents;
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
