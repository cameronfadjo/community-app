import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { Activity, ActivitySeed, isStillFresh } from '../../types';
import { COLLECTIONS, queryDocuments, where, orderBy } from '../firebase/firestore';

// The list changes rarely, so it is kept on the phone for a day
const STORAGE_KEY = 'community.activities';
const KEEP_FOR_MS = 24 * 60 * 60 * 1000;

interface Saved {
  savedAtMs: number;
  activities: ActivitySeed[];
}

const readSaved = async (nowMs: number): Promise<Activity[] | null> => {
  try {
    const text = await AsyncStorage.getItem(STORAGE_KEY);
    if (!text) {
      return null;
    }
    const saved = JSON.parse(text) as Saved;
    if (!isStillFresh(saved.savedAtMs, nowMs, KEEP_FOR_MS) || saved.activities.length === 0) {
      return null;
    }
    const stamp = Timestamp.fromMillis(saved.savedAtMs);
    return saved.activities.map((activity) => ({ ...activity, createdAt: stamp, updatedAt: stamp }));
  } catch (e) {
    console.error('[Activities] Could not read the saved list:', e);
    return null;
  }
};

const save = async (activities: Activity[], nowMs: number): Promise<void> => {
  try {
    const saved: Saved = {
      savedAtMs: nowMs,
      activities: activities.map(({ id, label, icon, color, sortOrder, active }) => ({
        id,
        label,
        icon,
        color,
        sortOrder,
        active,
      })),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {
    console.error('[Activities] Could not save the list:', e);
  }
};

/**
 * Get every activity people can browse by, in display order.
 * The list lives in Firestore so it can grow without an app release.
 * Pass `fresh` to skip the copy kept on the phone.
 */
export const getActivities = async ({ fresh = false } = {}): Promise<Activity[]> => {
  const nowMs = Date.now();
  if (!fresh) {
    const saved = await readSaved(nowMs);
    if (saved) {
      return saved;
    }
  }

  const activities = await queryDocuments<Activity>(COLLECTIONS.ACTIVITIES, [
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  ]);
  if (activities.length > 0) {
    await save(activities, nowMs);
  }
  return activities;
};
