import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  EventListing,
  PERK_WINDOW_MINUTES,
  PerkRedemption,
  RedemptionTimes,
  getPerkRedemptionId,
} from '../../types';
import { db } from '../firebase/config';
import { COLLECTIONS, queryDocuments, where } from '../firebase/firestore';

const redemptionRef = (eventId: string, userId: string) =>
  doc(db, COLLECTIONS.PERK_REDEMPTIONS, getPerkRedemptionId(eventId, userId));

export const toRedemptionTimes = (redemption: PerkRedemption): RedemptionTimes => ({
  unlockedAtMs: redemption.unlockedAt.toMillis(),
  expiresAtMs: redemption.expiresAt.toMillis(),
  redeemedAtMs: redemption.redeemedAt?.toMillis(),
});

/**
 * Get this person's perk for an event, if they have unlocked it
 */
export const getMyRedemption = async (
  eventId: string,
  userId: string
): Promise<PerkRedemption | null> => {
  const snapshot = await getDoc(redemptionRef(eventId, userId));
  return snapshot.exists() ? (snapshot.data() as PerkRedemption) : null;
};

/**
 * Get every perk this person has unlocked, newest first
 */
export const getMyRedemptions = async (userId: string): Promise<PerkRedemption[]> => {
  const redemptions = await queryDocuments<PerkRedemption>(COLLECTIONS.PERK_REDEMPTIONS, [
    where('userId', '==', userId),
  ]);
  return redemptions.sort((a, b) => b.unlockedAt.toMillis() - a.unlockedAt.toMillis());
};

/**
 * Unlock an event's perk on arrival. The window to show it starts now.
 */
export const unlockPerk = async (event: EventListing, userId: string): Promise<PerkRedemption> => {
  if (!event.perkLabel) {
    throw new Error('This event has no perk');
  }

  const ref = redemptionRef(event.id, userId);
  const expiresAt = Timestamp.fromMillis(Date.now() + PERK_WINDOW_MINUTES * 60 * 1000);

  await setDoc(ref, {
    id: ref.id,
    eventId: event.id,
    userId,
    perkLabel: event.perkLabel,
    eventTitle: event.title,
    venueName: event.venueName,
    unlockedAt: serverTimestamp(),
    expiresAt,
  });

  const saved = await getDoc(ref);
  return saved.data() as PerkRedemption;
};

/**
 * Mark a perk as redeemed. Called when staff press and hold.
 */
export const redeemPerk = async (eventId: string, userId: string): Promise<void> => {
  await updateDoc(redemptionRef(eventId, userId), { redeemedAt: serverTimestamp() });
};
