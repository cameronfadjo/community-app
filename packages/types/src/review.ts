import type { Timestamp } from 'firebase/firestore';

export interface Review {
  id: string;
  venueId: string;
  /** Denormalized for display; absent on older reviews */
  venueName?: string;
  userId: string;
  /** Denormalized for display */
  userName: string;
  /** Denormalized for display */
  userPhotoURL?: string;
  /** 1–5 */
  rating: number;
  text: string;
  /** Storage URLs */
  images?: string[];
  /** Helpful count (denormalized aggregate of `helpfulBy.length`) */
  helpful: number;
  /** User IDs who marked this review as helpful */
  helpfulBy: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReviewFormData {
  rating: number;
  text: string;
  images?: string[];
}
