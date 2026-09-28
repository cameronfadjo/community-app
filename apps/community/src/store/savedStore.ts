import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EventListing,
  SavableEvent,
  SavedEvent,
  isSaved,
  isStillFresh,
  markRemoved,
  pruneSaved,
  removeSaved,
  restoreSaved,
  toggleSaved,
  updateSaved,
} from '../types';
import { getEvent } from '../services/api/events';
import { useEventStore } from './eventStore';

// Kept on the phone only. Nothing about what someone has saved is sent
// anywhere, so nobody can tell who plans to be where.
const STORAGE_KEY = 'community.saved';

// Going back to the list within this time doesn't ask the server again
const KEEP_FOR_MS = 5 * 60 * 1000;

interface RefreshOptions {
  /** Ask the server even if the list was checked recently. Used by pull to refresh. */
  force?: boolean;
}

interface SavedState {
  /** Soonest first */
  saved: SavedEvent[];
  loaded: boolean;

  load: () => Promise<void>;
  /** Saves the event, or takes it off the list. Returns true when it is now saved. */
  toggle: (event: EventListing) => Promise<boolean>;
  /** Takes an event off the list */
  remove: (eventId: string) => Promise<void>;
  /** Puts back an event taken off by mistake */
  restore: (item: SavedEvent) => Promise<void>;
  /** Takes on changes hosts have made since the events were saved */
  refresh: (options?: RefreshOptions) => Promise<void>;
}

const toSavable = (event: EventListing): SavableEvent => ({
  id: event.id,
  title: event.title,
  venueName: event.venueName,
  activityIds: event.activityIds,
  startsAtMs: event.startsAt.toMillis(),
  endsAtMs: event.endsAt.toMillis(),
  status: event.status,
});

const keep = async (saved: SavedEvent[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {
    console.error('[Saved] Could not keep the list:', e);
  }
};

let refreshedAtMs: number | null = null;

export const useSavedStore = create<SavedState>((set, get) => {
  const replace = async (saved: SavedEvent[]): Promise<void> => {
    set({ saved });
    await keep(saved);
  };

  return {
    saved: [],
    loaded: false,

    load: async () => {
      if (get().loaded) {
        return;
      }
      let saved: SavedEvent[] = [];
      try {
        const text = await AsyncStorage.getItem(STORAGE_KEY);
        saved = text ? (JSON.parse(text) as SavedEvent[]) : [];
      } catch (e) {
        console.error('[Saved] Could not read the list:', e);
      }

      // Events that are over are dropped, so the list never becomes a
      // record of where someone has been
      const current = pruneSaved(saved, Date.now());
      set({ saved: current, loaded: true });
      if (current.length !== saved.length) {
        await keep(current);
      }
    },

    toggle: async (event) => {
      const saved = toggleSaved(get().saved, toSavable(event), Date.now());
      await replace(saved);
      return isSaved(saved, event.id);
    },

    remove: (eventId) => replace(removeSaved(get().saved, eventId)),

    restore: (item) => replace(restoreSaved(get().saved, item)),

    refresh: async ({ force = false } = {}) => {
      const wanted = pruneSaved(get().saved, Date.now());
      const checkedLately = !force && isStillFresh(refreshedAtMs, Date.now(), KEEP_FOR_MS);

      if (wanted.length === 0 || checkedLately) {
        if (wanted.length !== get().saved.length) {
          await replace(wanted);
        }
        return;
      }

      const { upcomingEvents, usingSampleData } = useEventStore.getState();
      const latest = upcomingEvents.map(toSavable);
      const gone: string[] = [];

      // Anything not among the loaded events is further ahead, was cancelled,
      // or has been removed. Ask about each one.
      if (!usingSampleData) {
        const loadedIds = new Set(upcomingEvents.map((event) => event.id));
        const others = wanted.filter((item) => !loadedIds.has(item.eventId));
        const found = await Promise.all(
          others.map((item) =>
            getEvent(item.eventId)
              .then((event) => ({ item, event, failed: false }))
              .catch(() => ({ item, event: null, failed: true }))
          )
        );

        for (const { item, event, failed } of found) {
          if (event) {
            latest.push(toSavable(event));
          } else if (!failed) {
            // A failed lookup says nothing either way, so only a clear
            // "not there" counts
            gone.push(item.eventId);
          }
        }
      }
      refreshedAtMs = Date.now();

      // Worked out from the list as it is now: something may have been
      // saved or taken off while the server was being asked
      await replace(markRemoved(updateSaved(pruneSaved(get().saved, Date.now()), latest), gone));
    },
  };
});
