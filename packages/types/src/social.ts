import type { Timestamp } from 'firebase/firestore';

export type CheckInVisibility = 'public' | 'friends' | 'private';

export interface CheckIn {
  id: string;
  userId: string;
  /** Denormalized */
  userName: string;
  /** Denormalized */
  userPhotoURL?: string;
  venueId: string;
  /** Denormalized */
  venueName: string;
  /** Denormalized */
  venueCategory: string;
  caption?: string;
  /** Storage URLs */
  images?: string[];
  visibility: CheckInVisibility;
  likes: number;
  /** User IDs */
  likedBy: string[];
  createdAt: Timestamp;
}

export interface CheckInFormData {
  caption?: string;
  images?: string[];
  visibility: CheckInVisibility;
}

export interface SocialFeedItem extends CheckIn {}
