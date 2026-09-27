/**
 * Reading and writing the signed-in partner's events.
 */
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { COLLECTIONS } from '@community/firebase';
import {
  DEFAULT_ACTIVITIES,
  buildEventOccurrences,
  type ActivitySeed,
  type EventFormData,
  type EventListing,
  type Venue,
} from '@community/types';
import { db } from './firebase/config';

export type ActivityOption = Pick<ActivitySeed, 'id' | 'label' | 'color'>;

/**
 * Activities to choose from. Falls back to the starting set when the
 * collection hasn't been seeded yet.
 */
export async function loadActivityOptions(): Promise<ActivityOption[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.ACTIVITIES),
        where('active', '==', true),
        orderBy('sortOrder', 'asc'),
      ),
    );
    if (!snapshot.empty) {
      return snapshot.docs.map((item) => {
        const data = item.data() as ActivitySeed;
        return { id: item.id, label: data.label, color: data.color };
      });
    }
  } catch (error) {
    console.error('Error loading activities:', error);
  }
  return DEFAULT_ACTIVITIES.map(({ id, label, color }) => ({ id, label, color }));
}

export async function loadApprovedVenues(): Promise<Venue[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.VENUES), where('moderationStatus', '==', 'approved')),
  );
  return snapshot.docs
    .map((item) => ({ ...item.data(), id: item.id }) as Venue)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadMyEvents(organizerId: string): Promise<EventListing[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EVENTS),
      where('organizerId', '==', organizerId),
      orderBy('startsAt', 'desc'),
    ),
  );
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as EventListing);
}

export async function loadEvent(eventId: string): Promise<EventListing | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as EventListing) : null;
}

/** Firestore rejects undefined, so optional fields are left out when empty */
const withoutEmpty = <T extends Record<string, unknown>>(fields: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== ''),
  ) as Partial<T>;

const sharedFields = (form: EventFormData, venue: Venue) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  activityIds: form.activityIds,
  venueId: venue.id,
  venueName: venue.name,
  location: venue.location,
  coverCents: form.coverCents,
  images: form.images,
  tags: form.tags,
  audience: form.audience,
  ...withoutEmpty({
    organizerName: form.organizerName?.trim(),
    ticketUrl: form.ticketUrl?.trim(),
    perkLabel: form.perkLabel?.trim(),
  }),
});

/**
 * Publishes the event, one document per occurrence when it repeats.
 * Returns how many were created.
 */
export async function createEvents(
  form: EventFormData,
  venue: Venue,
  organizerId: string,
): Promise<number> {
  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  const occurrences = buildEventOccurrences(form, () => doc(eventsRef).id);
  const batch = writeBatch(db);

  for (const occurrence of occurrences) {
    const ref = doc(eventsRef);
    batch.set(ref, {
      id: ref.id,
      ...sharedFields(form, venue),
      organizerId,
      startsAt: Timestamp.fromMillis(occurrence.startsAtMs),
      endsAt: Timestamp.fromMillis(occurrence.endsAtMs),
      ...withoutEmpty({ seriesId: occurrence.seriesId }),
      status: 'scheduled',
      confirmedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return occurrences.length;
}

/** Saves changes to a single occurrence */
export async function updateEvent(
  eventId: string,
  form: EventFormData,
  venue: Venue,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EVENTS, eventId), {
    ...sharedFields(form, venue),
    startsAt: Timestamp.fromDate(form.startsAt),
    endsAt: Timestamp.fromDate(form.endsAt),
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setEventStatus(
  eventId: string,
  status: EventListing['status'],
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EVENTS, eventId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Tells people the details were checked and are still right */
export async function confirmEvent(eventId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EVENTS, eventId), {
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Cancels every occurrence in the series that hasn't started yet */
export async function cancelUpcomingInSeries(
  events: EventListing[],
  seriesId: string,
  nowMs: number,
): Promise<number> {
  const upcoming = events.filter(
    (event) =>
      event.seriesId === seriesId &&
      event.status === 'scheduled' &&
      event.startsAt.toMillis() > nowMs,
  );

  const batch = writeBatch(db);
  for (const event of upcoming) {
    batch.update(doc(db, COLLECTIONS.EVENTS, event.id), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return upcoming.length;
}
