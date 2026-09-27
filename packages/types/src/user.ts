import type { Timestamp } from 'firebase/firestore';
import type { ModerationStatus } from './common';

/**
 * Someone with an account in the Community App. Nobody has a public
 * profile, so this holds only what signing in and perks need.
 */
export interface User {
  uid: string;
  email: string;
  /** Shown only to the person themselves */
  displayName: string;
  /** Accounts start approved. An admin can reject one to block it. */
  moderationStatus: ModerationStatus;
  /** When the person confirmed at sign-up that they are 18 or older */
  confirmedAdultAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
