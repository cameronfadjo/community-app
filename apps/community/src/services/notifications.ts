import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PlannedNotification } from '../types';

/**
 * Notifications are scheduled on the phone itself, from events the app has
 * already loaded. Nothing about the person is sent to a server.
 */

/** Scheduling works in the phone app, not in a web browser */
export const canScheduleNotifications = Platform.OS !== 'web';

const CHANNEL_ID = 'whats-on';

export type PermissionResult = 'granted' | 'denied' | 'unsupported';

/** What the phone allows: not asked yet, allowed, or refused */
export type NotificationPermission = 'granted' | 'undetermined' | 'denied';

// Android files notifications under a channel, which has to exist first
const ensureChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "What's on",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

export const configureNotifications = (): void => {
  if (!canScheduleNotifications) {
    return;
  }

  // Show the nudge even if the app happens to be open
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

export const requestNotificationPermission = async (): Promise<PermissionResult> => {
  if (!canScheduleNotifications) {
    return 'unsupported';
  }

  await ensureChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return 'granted';
  }
  if (!current.canAskAgain) {
    return 'denied';
  }

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
};

/** What the phone currently allows, without asking the person anything */
export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!canScheduleNotifications) {
    return 'undetermined';
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return 'granted';
  }
  return current.canAskAgain ? 'undetermined' : 'denied';
};

export const cancelScheduledNotifications = async (): Promise<void> => {
  if (!canScheduleNotifications) {
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/** Replaces whatever was scheduled before with this plan */
export const scheduleNotifications = async (plan: PlannedNotification[]): Promise<void> => {
  if (!canScheduleNotifications) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  // Older Android phones allow notifications without being asked, so the
  // channel may not have been set up yet
  await ensureChannel();

  for (const notification of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.eventId ? { eventId: notification.eventId } : {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(notification.fireAtMs),
        channelId: CHANNEL_ID,
      },
    });
  }
};

/**
 * Calls back with the event to open when a notification is tapped.
 * Returns a function that stops listening.
 */
export const onNotificationOpened = (open: (eventId: string | null) => void): (() => void) => {
  if (!canScheduleNotifications) {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const eventId = response.notification.request.content.data?.eventId;
    open(typeof eventId === 'string' ? eventId : null);
  });
  return () => subscription.remove();
};
