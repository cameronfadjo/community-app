import type { Timestamp } from 'firebase/firestore';

/** Admin/staff user with elevated permissions. */
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  /** Granular permission flags, e.g. 'moderate_users', 'moderate_venues' */
  permissions: string[];
  createdAt: Timestamp;
  /** UID of the admin who created this account */
  createdBy: string;
}

/** Partner (venue owner) account. */
export interface Partner {
  uid: string;
  email: string;
  displayName: string;
  businessName: string;
  role: 'partner';
  /** Venue IDs this partner manages */
  venueIds: string[];
  verified: boolean;
  subscriptionTier: 'free' | 'basic' | 'premium';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ModerationActionType = 'user' | 'venue' | 'review' | 'checkin';
export type ModerationDecision = 'approve' | 'reject';

/** Audit log entry for a moderation decision. */
export interface ModerationAction {
  id: string;
  type: ModerationActionType;
  resourceId: string;
  action: ModerationDecision;
  /** UID of admin/partner who took the action */
  moderatedBy: string;
  reason?: string;
  createdAt: Timestamp;
}
