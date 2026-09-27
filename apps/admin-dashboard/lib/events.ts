/**
 * Reading and writing events from the admin dashboard, where an admin can
 * post for a host and take any event down.
 */
import { createEventStore } from '@community/firebase';
import { db } from './firebase/config';

export type { ActivityOption } from '@community/firebase';

export const {
  loadActivityOptions,
  loadApprovedVenues,
  loadUpcomingEvents,
  loadEvent,
  createEvents,
  updateEvent,
  setEventStatus,
  confirmEvent,
  cancelUpcomingInSeries,
  confirmUpcomingInSeries,
  loadClaims,
  approveClaim,
  rejectClaim,
} = createEventStore(db);
