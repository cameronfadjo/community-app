import type { Timestamp, GeoPoint } from 'firebase/firestore';
import type { ModerationStatus } from './common';
import type { SocialLinks } from './venue-social';

export const VENUE_CATEGORIES = [
  'bar',
  'club',
  'restaurant',
  'cafe',
  'community_space',
  'shop',
  'theater',
  'fitness',
  'outdoors',
  'other',
] as const;

export type VenueCategory = (typeof VENUE_CATEGORIES)[number];

export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  bar: 'Bar',
  club: 'Club',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  community_space: 'Community space',
  shop: 'Shop',
  theater: 'Theater or cinema',
  fitness: 'Gym or studio',
  outdoors: 'Outdoors',
  other: 'Other',
};

export interface VenueLocation {
  coordinates: GeoPoint;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface VenueContact {
  phone?: string;
  email?: string;
  website?: string;
  /** Links to the venue's social accounts */
  social?: SocialLinks;
}

/**
 * A place where events happen. This is an approved venue, which always has
 * an address and a map position. Events copy both.
 */
export interface Venue {
  id: string;
  name: string;
  /** What kind of place it is, in a sentence or two */
  description: string;
  category: VenueCategory;
  location: VenueLocation;
  /** Storage URLs */
  images: string[];
  contact: VenueContact;
  /** Paid partnership flag — featured venues get premium placement. */
  featured: boolean;
  /** Step-free entry, bathrooms, parking, and the like */
  accessibility?: string;
  /** For admins only. Never shown in the app. */
  notes?: string;
  /** Where the venue came from, when it was loaded from a list */
  source?: string;
  /**
   * An admin has checked the name, address, and map position. Adding or
   * loading a venue never sets this; verifying is its own step.
   */
  detailsVerified: boolean;
  verifiedAt?: Timestamp;
  /** ID of the admin who verified it */
  verifiedBy?: string;
  moderationStatus: ModerationStatus;
  /** ID of the account that added it, or 'import' */
  submittedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A venue as admins see it, which may still be waiting for its map
 * position. It cannot be approved until it has one.
 */
export type VenueDraft = Omit<Venue, 'location'> & {
  location: Omit<VenueLocation, 'coordinates'> & { coordinates: GeoPoint | null };
};
