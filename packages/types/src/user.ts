import type { Timestamp, GeoPoint } from 'firebase/firestore';
import type { ModerationStatus, SubscriptionTier } from './common';

/**
 * Consumer user profile — represents a person using the Community App.
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  location?: GeoPoint;
  verified: boolean;
  moderationStatus: ModerationStatus;
  subscriptionTier: SubscriptionTier;
  /** IDs of venues the user has favorited */
  favorites: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Display-only subset of `User` (omits identifier). */
export interface UserProfile extends Omit<User, 'uid'> {}
