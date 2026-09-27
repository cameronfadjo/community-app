import type { Timestamp } from 'firebase/firestore';

/**
 * A perk someone unlocked by arriving at an event. Stored in
 * `perkRedemptions` with the ID `{eventId}_{userId}`, so each person gets
 * one per event.
 *
 * Readable only by the person it belongs to. Organizers see totals in
 * `eventStats`, never these records.
 */
export interface PerkRedemption {
  id: string;
  eventId: string;
  userId: string;

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

/**
 * Perk totals for one event, kept up to date by a Cloud Function. Stored in
 * `eventStats/{eventId}` and readable by the event's organizer.
 */
export interface EventStats {
  eventId: string;
  organizerId: string;
  /** People who arrived and unlocked the perk */
  perkUnlocked: number;
  /** Of those, how many had it redeemed at the bar */
  perkRedeemed: number;
  updatedAt: Timestamp;
}
