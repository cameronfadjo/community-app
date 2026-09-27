import type { Timestamp, GeoPoint } from 'firebase/firestore';
import type { ModerationStatus } from './common';

export type VenueCategory =
  | 'resort'
  | 'club'
  | 'restaurant'
  | 'bar'
  | 'event'
  | 'attraction';

/** Price range from $ (1) to $$$$ (4). */
export type PriceRange = 1 | 2 | 3 | 4;

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
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  category: VenueCategory;
  location: VenueLocation;
  priceRange: PriceRange;
  /** Storage URLs */
  images: string[];
  contact: VenueContact;
  /** Paid partnership flag — featured venues get premium placement. */
  featured: boolean;
  moderationStatus: ModerationStatus;
  /** ID of the account that added it */
  submittedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
