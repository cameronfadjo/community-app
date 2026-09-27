import { create } from 'zustand';
import { EventListing, PERK_WINDOW_MINUTES, RedemptionTimes } from '../types';
import {
  getMyRedemption,
  getMyRedemptions,
  redeemPerk,
  toRedemptionTimes,
  unlockPerk,
} from '../services/api/perks';

/** An unlocked perk, with what the perk screen needs to draw it */
export interface UnlockedPerk extends RedemptionTimes {
  eventId: string;
  perkLabel: string;
  eventTitle: string;
  venueName: string;
}

interface PerkOptions {
  /** Null when nobody is signed in */
  userId: string | null;
  /** Sample events aren't in Firestore, so their perks are kept in memory */
  sample: boolean;
}

interface PerkState {
  perks: Record<string, UnlockedPerk>;
  /** Where to return after signing in to unlock a perk */
  pendingReturnPath: string | null;

  setPendingReturnPath: (path: string | null) => void;
  loadForEvent: (eventId: string, options: PerkOptions) => Promise<void>;
  loadMine: (options: PerkOptions) => Promise<void>;
  unlock: (event: EventListing, options: PerkOptions) => Promise<UnlockedPerk>;
  redeem: (eventId: string, options: PerkOptions) => Promise<void>;
}

const remember = (
  set: (update: (state: PerkState) => Partial<PerkState>) => void,
  perk: UnlockedPerk
) => set((state) => ({ perks: { ...state.perks, [perk.eventId]: perk } }));

export const usePerkStore = create<PerkState>((set, get) => ({
  perks: {},
  pendingReturnPath: null,

  setPendingReturnPath: (path) => set({ pendingReturnPath: path }),

  loadForEvent: async (eventId, { userId, sample }) => {
    if (sample || !userId) {
      return;
    }
    const redemption = await getMyRedemption(eventId, userId);
    if (redemption) {
      remember(set, { ...redemption, ...toRedemptionTimes(redemption) });
    }
  },

  loadMine: async ({ userId, sample }) => {
    if (sample || !userId) {
      return;
    }
    const redemptions = await getMyRedemptions(userId);
    set((state) => ({
      perks: {
        ...state.perks,
        ...Object.fromEntries(
          redemptions.map((redemption) => [
            redemption.eventId,
            { ...redemption, ...toRedemptionTimes(redemption) },
          ])
        ),
      },
    }));
  },

  unlock: async (event, { userId, sample }) => {
    if (!event.perkLabel) {
      throw new Error('This event has no perk');
    }

    let perk: UnlockedPerk;
    if (sample) {
      const nowMs = Date.now();
      perk = {
        eventId: event.id,
        perkLabel: event.perkLabel,
        eventTitle: event.title,
        venueName: event.venueName,
        unlockedAtMs: nowMs,
        expiresAtMs: nowMs + PERK_WINDOW_MINUTES * 60 * 1000,
      };
    } else {
      if (!userId) {
        throw new Error('Sign in to unlock this perk');
      }
      const redemption = await unlockPerk(event, userId);
      perk = { ...redemption, ...toRedemptionTimes(redemption) };
    }

    remember(set, perk);
    return perk;
  },

  redeem: async (eventId, { userId, sample }) => {
    const perk = get().perks[eventId];
    if (!perk) {
      throw new Error('This perk has not been unlocked');
    }

    if (!sample) {
      if (!userId) {
        throw new Error('Sign in to redeem this perk');
      }
      await redeemPerk(eventId, userId);
    }

    remember(set, { ...perk, redeemedAtMs: Date.now() });
  },
}));
