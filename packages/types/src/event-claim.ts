/**
 * Rules for a host claiming events an admin posted for them. The host asks,
 * an admin checks the claim, and the events are handed over.
 */

import type { Timestamp } from 'firebase/firestore';
import type { EventStatus } from './event';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

/** A host's request to take over an event, or every date of a repeating one */
export interface EventClaim {
  id: string;
  /** The series for a repeating event, otherwise the event */
  claimKey: string;
  /** Copied from the event so the claim reads on its own */
  eventTitle: string;
  organizerName?: string;
  venueName: string;

  /** The partner account asking */
  partnerId: string;
  partnerEmail: string;
  /** How an admin can tell they run the event */
  note: string;
  /** The host says the details shown are right as they stand */
  detailsCorrect: boolean;

  status: ClaimStatus;
  createdAt: Timestamp;
  decidedAt?: Timestamp;
  /** UID of the admin who decided */
  decidedBy?: string;
}

export const MAX_CLAIM_NOTE_LENGTH = 500;

/** A repeating event is claimed as a whole, so every date moves together */
export const getClaimKey = (event: { id: string; seriesId?: string }): string =>
  event.seriesId ?? event.id;

/** One claim per host per event or series, enforced by the document ID */
export const getClaimId = (claimKey: string, partnerId: string): string =>
  `${claimKey}_${partnerId}`;

interface ClaimableEvent {
  id: string;
  seriesId?: string;
  title: string;
  venueName: string;
  organizerName?: string;
  startsAtMs: number;
  status: EventStatus;
  postedOnBehalfBy?: string;
}

export interface ClaimableGroup {
  claimKey: string;
  title: string;
  organizerName?: string;
  venueName: string;
  nextStartsAtMs: number;
  /** How many dates are still to come */
  dates: number;
}

/**
 * The events a host could claim: posted by an admin, still to come, and not
 * taken down. A repeating event appears once. Soonest first.
 */
export const groupClaimableEvents = (events: ClaimableEvent[], nowMs: number): ClaimableGroup[] => {
  const groups = new Map<string, ClaimableGroup>();

  for (const event of events) {
    if (!event.postedOnBehalfBy || event.status !== 'scheduled' || event.startsAtMs <= nowMs) {
      continue;
    }

    const claimKey = getClaimKey(event);
    const group = groups.get(claimKey);
    if (!group) {
      groups.set(claimKey, {
        claimKey,
        title: event.title,
        organizerName: event.organizerName,
        venueName: event.venueName,
        nextStartsAtMs: event.startsAtMs,
        dates: 1,
      });
    } else {
      group.dates += 1;
      group.nextStartsAtMs = Math.min(group.nextStartsAtMs, event.startsAtMs);
    }
  }

  return [...groups.values()].sort((a, b) => a.nextStartsAtMs - b.nextStartsAtMs);
};

export interface ClaimForm {
  /** They have said they run the event */
  isHost: boolean;
  note: string;
}

export type ClaimFormErrors = Partial<Record<keyof ClaimForm, string>>;

export const validateClaim = (form: ClaimForm): ClaimFormErrors => {
  const errors: ClaimFormErrors = {};

  if (!form.isHost) {
    errors.isHost = 'Confirm that you run this event.';
  }

  const note = form.note.trim();
  if (!note) {
    errors.note = 'Tell us how you are involved, so we can check.';
  } else if (note.length > MAX_CLAIM_NOTE_LENGTH) {
    errors.note = `Keep this under ${MAX_CLAIM_NOTE_LENGTH} characters.`;
  }

  return errors;
};
