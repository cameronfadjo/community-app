import { useCallback, useEffect } from 'react';
import { EventListing, ReminderStatus, SavedEvent, getReminderStatus, isSaved } from '../types';
import { useSavedStore } from '../store/savedStore';
import { useNotificationStore } from '../store/notificationStore';
import { countSignal } from '../services/api/signals';
import { canScheduleNotifications } from '../services/notifications';

/**
 * Saving events and being reminded of them. The list and the reminders
 * stay on the phone.
 */
export const useSavedEvents = () => {
  const { saved, loaded, load, toggle, remove, restore } = useSavedStore();
  const {
    prefs,
    permission,
    loaded: prefsLoaded,
    load: loadPrefs,
    checkPermission,
    askPermission,
    update,
    reschedule,
  } = useNotificationStore();

  useEffect(() => {
    if (!loaded) {
      load();
    }
    if (!prefsLoaded) {
      loadPrefs();
    }
    checkPermission();
  }, [loaded, load, prefsLoaded, loadPrefs, checkPermission]);

  const reminderStatus: ReminderStatus = getReminderStatus({
    supported: canScheduleNotifications,
    wanted: prefs.savedReminders,
    permission,
  });

  /** Returns true when the event is now saved */
  const toggleSaved = useCallback(
    async (event: EventListing): Promise<boolean> => {
      const nowSaved = await toggle(event);
      if (nowSaved) {
        // Counted for the host, with nothing about who saved it
        countSignal(event.id, 'save');
      }
      await reschedule();
      return nowSaved;
    },
    [toggle, reschedule]
  );

  const removeSaved = useCallback(
    async (eventId: string) => {
      await remove(eventId);
      await reschedule();
    },
    [remove, reschedule]
  );

  const restoreSaved = useCallback(
    async (item: SavedEvent) => {
      await restore(item);
      await reschedule();
    },
    [restore, reschedule]
  );

  /** Asks the phone for permission, after the person has said they want reminders */
  const turnOnReminders = useCallback(async () => {
    await askPermission();
    await update({ savedReminders: true });
  }, [askPermission, update]);

  const turnOffReminders = useCallback(async () => {
    await update({ savedReminders: false });
  }, [update]);

  return {
    saved,
    loaded,
    isSaved: (eventId: string) => isSaved(saved, eventId),
    toggleSaved,
    removeSaved,
    restoreSaved,
    reminderStatus,
    turnOnReminders,
    turnOffReminders,
  };
};
