import type { Timestamp } from 'firebase/firestore';

/**
 * A perk someone unlocked by arriving at an event. Stored in
 * `perkRedemptions` with the ID `{eventId}_{userId}`, so each person gets
 * one per event.
 */
export interface PerkRedemption {
  id: string;
  eventId: string;
  userId: string;
  /** Lets the organizer count redemptions for their own events */
  organizerId: string;
  venueId: string;

  /** Denormalized so the perk screen needs no other lookups */
  perkLabel: string;
  eventTitle: string;
  venueName: string;

  unlockedAt: Timestamp;
  /** The perk must be shown at the bar before this */
  expiresAt: Timestamp;
  /** Set when staff press and hold to redeem */
  redeemedAt?: Timestamp;
}
