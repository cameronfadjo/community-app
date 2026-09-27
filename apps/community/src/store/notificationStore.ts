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
  NotificationPermission,
  cancelScheduledNotifications,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleNotifications,
} from '../services/notifications';
import { useEventStore } from './eventStore';
import { useSavedStore } from './savedStore';

// Kept on the phone only
const STORAGE_KEY = 'community.notificationPrefs';

interface NotificationState {
  prefs: NotificationPrefs;
  /** What is currently scheduled, soonest first */
  plan: PlannedNotification[];
  /** What the phone allows. It can change in the phone's settings at any time. */
  permission: NotificationPermission;
  loaded: boolean;

  load: () => Promise<void>;
  /** Looks at what the phone allows, without asking the person anything */
  checkPermission: () => Promise<NotificationPermission>;
  /** Asks the person to allow notifications. Only ever called after they ask for one. */
  askPermission: () => Promise<NotificationPermission>;
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
  permission: 'undetermined',
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

  checkPermission: async () => {
    const permission = await getNotificationPermission();
    set({ permission });
    return permission;
  },

  askPermission: async () => {
    const result = await requestNotificationPermission();
    // A web browser can't send them, which is handled where reminders are described
    const permission = result === 'unsupported' ? 'undetermined' : result;
    set({ permission });
    return permission;
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

  // Runs when the app opens, when something is saved, and whenever
  // preferences change, so cancelled or edited events drop out of what is
  // scheduled
  reschedule: async () => {
    const { prefs } = get();
    const saved = prefs.savedReminders ? useSavedStore.getState().saved : [];

    if (!prefs.enabled && saved.length === 0) {
      set({ plan: [] });
      await cancelScheduledNotifications();
      return;
    }

    try {
      // Nudges are about events in general. Reminders only need what was saved.
      const events = prefs.enabled ? await loadUpcomingEvents() : [];
      const activityLabels = Object.fromEntries(
        useEventStore.getState().activities.map((activity) => [activity.id, activity.label])
      );

      const plan = buildNotificationPlan({
        events: events.map(toPlanEvent),
        saved,
        prefs,
        activityLabels,
        nowMs: Date.now(),
      });
      set({ plan });

      if ((await get().checkPermission()) === 'granted') {
        await scheduleNotifications(plan);
      }
    } catch (e) {
      console.error('[Notifications] Error scheduling:', e);
    }
  },
}));
