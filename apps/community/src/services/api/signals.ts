import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, increment, setDoc } from 'firebase/firestore';
import {
  CountedToday,
  SignalKind,
  getSignalFields,
  markCounted,
  shouldCount,
  toDayKey,
} from '../../types';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/firestore';

// What this phone has counted today. Kept on the phone, and replaced each
// day, so it never becomes a history of what someone looked at.
const STORAGE_KEY = 'community.countedToday';

const EMPTY: CountedToday = { day: '', counted: [] };

// Read once, then kept in step here, so two counts in a row can't both
// read the list before either has saved it
let seen: CountedToday | null = null;

const readSeen = async (): Promise<CountedToday> => {
  if (seen) {
    return seen;
  }
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    seen = saved ? (JSON.parse(saved) as CountedToday) : EMPTY;
  } catch {
    seen = EMPTY;
  }
  return seen;
};

/**
 * Adds one to an event's count for its host to see. The count carries
 * nothing about the person: no account, no phone, no location. Each phone
 * counts once per event per day.
 *
 * Never throws and never holds the screen up. A count that fails is lost.
 */
export const countSignal = (eventId: string, kind: SignalKind): void => {
  const run = async () => {
    const now = new Date();
    const today = toDayKey(now);

    const before = await readSeen();
    if (!shouldCount(before, eventId, kind, today)) {
      return;
    }
    seen = markCounted(before, eventId, kind, today);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seen)).catch(() => undefined);

    await setDoc(
      doc(db, COLLECTIONS.EVENT_SIGNALS, eventId, 'days', today),
      {
        eventId,
        day: today,
        // Views are also counted by the hour, so hosts can see when people look
        ...Object.fromEntries(getSignalFields(kind, now).map((field) => [field, increment(1)])),
      },
      { merge: true }
    );
  };

  run().catch((e) => console.warn('[Signals] Count not recorded:', e?.code ?? e));
};
