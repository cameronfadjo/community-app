/**
 * Rules for perks that unlock on arrival. Takes plain millisecond values so
 * the app, the dashboards, and Cloud Functions all agree.
 */

import type { EventStatus } from './event';

/** How close to the venue counts as having arrived */
export const ARRIVAL_RADIUS_KM = 0.15;

/** How long an unlocked perk can be shown at the bar */
export const PERK_WINDOW_MINUTES = 15;

/** Perks open this long before the start, for people who turn up early */
export const PERK_OPENS_MINUTES_BEFORE = 30;

const MS_PER_MINUTE = 60 * 1000;

export type RedemptionState = 'unlocked' | 'redeemed' | 'expired';

export interface RedemptionTimes {
  unlockedAtMs: number;
  expiresAtMs: number;
  redeemedAtMs?: number;
}

export const getRedemptionState = (redemption: RedemptionTimes, nowMs: number): RedemptionState => {
  if (redemption.redeemedAtMs !== undefined) {
    return 'redeemed';
  }
  return nowMs >= redemption.expiresAtMs ? 'expired' : 'unlocked';
};

export const getSecondsLeft = (expiresAtMs: number, nowMs: number): number =>
  Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));

/** One redemption per person per event, enforced by the document ID */
export const getPerkRedemptionId = (eventId: string, userId: string): string =>
  `${eventId}_${userId}`;

export type PerkAvailability =
  /** The event has no perk */
  | 'none'
  /** Too early: the event hasn't opened for perks */
  | 'not_yet'
  /** The event is over or cancelled */
  | 'ended'
  /** We don't know where the person is */
  | 'needs_location'
  /** Not at the venue yet */
  | 'too_far'
  /** At the venue, but not signed in */
  | 'needs_sign_in'
  /** At the venue and signed in: can unlock */
  | 'ready'
  | RedemptionState;

export interface PerkAvailabilityInput {
  event: {
    perkLabel?: string;
    status: EventStatus;
    startsAtMs: number;
    endsAtMs: number;
  };
  nowMs: number;
  isSignedIn: boolean;
  /** Undefined when location is unknown */
  distanceKm?: number;
  redemption: RedemptionTimes | null;
}

/**
 * Where someone stands with an event's perk. Sign-in is asked for last, so
 * nobody creates an account for a perk they are not yet able to use.
 */
export const getPerkAvailability = ({
  event,
  nowMs,
  isSignedIn,
  distanceKm,
  redemption,
}: PerkAvailabilityInput): PerkAvailability => {
  if (!event.perkLabel) {
    return 'none';
  }

  // Once unlocked it stays unlocked, even if the location signal drifts
  if (redemption) {
    return getRedemptionState(redemption, nowMs);
  }

  if (event.status === 'cancelled' || nowMs >= event.endsAtMs) {
    return 'ended';
  }
  if (nowMs < event.startsAtMs - PERK_OPENS_MINUTES_BEFORE * MS_PER_MINUTE) {
    return 'not_yet';
  }
  if (distanceKm === undefined) {
    return 'needs_location';
  }
  if (distanceKm > ARRIVAL_RADIUS_KM) {
    return 'too_far';
  }
  return isSignedIn ? 'ready' : 'needs_sign_in';
};
