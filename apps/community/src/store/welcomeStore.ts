import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Kept on the phone only. Holds the time of confirming, never a birth date.
const STORAGE_KEY = 'community.confirmedAdultAt';

interface WelcomeState {
  /** The person has confirmed on this device that they are 18 or older */
  confirmedAdult: boolean;
  loaded: boolean;

  load: () => Promise<void>;
  confirm: () => Promise<void>;
}

export const useWelcomeStore = create<WelcomeState>((set) => ({
  confirmedAdult: false,
  loaded: false,

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ confirmedAdult: stored !== null, loaded: true });
    } catch (e) {
      // Ask again rather than let someone through unasked
      console.error('[Welcome] Could not read the age confirmation:', e);
      set({ confirmedAdult: false, loaded: true });
    }
  },

  confirm: async () => {
    set({ confirmedAdult: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (e) {
      // They can carry on; they'll be asked again next time
      console.error('[Welcome] Could not save the age confirmation:', e);
    }
  },
}));
