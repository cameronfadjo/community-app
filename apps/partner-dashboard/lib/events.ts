/**
 * Reading and writing the signed-in partner's events.
 */
import { createEventStore } from '@community/firebase';
import { db } from './firebase/config';

export type { ActivityOption, PerkCounts } from '@community/firebase';

export const {
  loadActivityOptions,
  loadApprovedVenues,
  loadMyEvents,
  loadEvent,
  createEvents,
  updateEvent,
  setEventStatus,
  confirmEvent,
  cancelUpcomingInSeries,
  loadPerkCounts,
  loadSignalDays,
  loadUpcomingEvents,
  createClaim,
  loadMyClaims,
  withdrawClaim,
} = createEventStore(db);
