/**
 * Canonical collection names used in Firestore.
 * Use these constants instead of string literals to prevent typos.
 */
export const COLLECTIONS = {
  USERS: 'users',
  VENUES: 'venues',
  REVIEWS: 'reviews',
  CHECK_INS: 'checkIns',
  OFFERS: 'offers',
  REDEMPTIONS: 'redemptions',
  ANALYTICS_EVENTS: 'analytics_events',
  AGGREGATED_ANALYTICS: 'aggregated_analytics',
  ADMINS: 'admins',
  PARTNERS: 'partners',
  MODERATION_ACTIONS: 'moderation_actions',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
