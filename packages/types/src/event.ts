import type { Timestamp } from 'firebase/firestore';
import type { VenueLocation } from './venue';

export type EventStatus = 'scheduled' | 'cancelled';

/** Anonymous crowd level, derived from arrival counts. */
export type BusyLevel = 'quiet' | 'filling_up' | 'packed';

/** Minimum age to get in. 0 means all ages. */
export type MinimumAge = 0 | 18 | 21;

/** Facts people filter on. Set by the organizer when posting. */
export interface EventTags {
  goodForSolo: boolean;
  firstTimersWelcome: boolean;
  alcoholFree: boolean;
  stepFreeEntry: boolean;
  minimumAge: MinimumAge;
}

/**
 * A dated thing to go to. The event, not the venue, is what people browse.
 *
 * Recurring events are stored as one document per occurrence sharing a
 * `seriesId`, so "tonight" is a plain date-range query.
 */
export interface EventListing {
  id: string;
  title: string;
  /** "What to expect": crowd, vibe, dress */
  description: string;
  /** Activity IDs, most relevant first. At least one. */
  activityIds: string[];

  // Where
  venueId: string;
  /** Denormalized */
  venueName: string;
  /** Denormalized so nearby queries don't need a venue lookup */
  location: VenueLocation;

  // Who posted it
  /** UID of the partner or organizer */
  organizerId: string;
  /** Shown when the organizer is not the venue itself */
  organizerName?: string;

  // When
  startsAt: Timestamp;
  endsAt: Timestamp;
  /** Shared by every occurrence of a recurring event */
  seriesId?: string;

  // Cost
  /** Cover charge in cents. 0 means free entry. */
  coverCents: number;
  /** Link out to the organizer's own ticketing */
  ticketUrl?: string;

  // Presentation
  /** Storage URLs */
  images: string[];
  tags: EventTags;
  /** "Who it's for", free-form labels set by the organizer. e.g. "Everyone welcome" */
  audience: string[];

  /** Perk unlocked on arrival, if any */
  offerId?: string;
  /** Denormalized from the offer. e.g. "Free drink" */
  perkLabel?: string;

  /** Anonymous crowd level, kept up to date from arrival counts */
  busyLevel?: BusyLevel;

  status: EventStatus;
  /** Last time the organizer confirmed the details are still right */
  confirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** What the partner dashboard form collects. */
export interface EventFormData {
  title: string;
  description: string;
  activityIds: string[];
  venueId: string;
  organizerName?: string;
  startsAt: Date;
  endsAt: Date;
  /** When set, the event repeats weekly until this date */
  repeatWeeklyUntil?: Date;
  coverCents: number;
  ticketUrl?: string;
  images: string[];
  tags: EventTags;
  audience: string[];
  offerId?: string;
  /** Shown on cards as "{perkLabel} when you arrive" */
  perkLabel?: string;
}

export interface EventFilters {
  activityId?: string;
  goodForSolo?: boolean;
  alcoholFree?: boolean;
  freeEntry?: boolean;
  stepFreeEntry?: boolean;
  /** Show events open to this age. e.g. 18 hides 21+ events */
  admitsAge?: 18 | 21;
}
