/**
 * Canonical collection names used in Firestore.
 * Use these constants instead of string literals to prevent typos.
 */
export const COLLECTIONS = {
  USERS: 'users',
  VENUES: 'venues',
  EVENTS: 'events',
  ACTIVITIES: 'activities',
  PERK_REDEMPTIONS: 'perkRedemptions',
  EVENT_STATS: 'eventStats',
  EVENT_CLAIMS: 'eventClaims',
  EVENT_SIGNALS: 'eventSignals',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
