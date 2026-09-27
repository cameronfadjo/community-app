/**
 * Reading and writing events. Shared by the partner dashboard, where hosts
 * post their own events, and the admin dashboard, where an admin can post
 * for a host.
 */
import {
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  DEFAULT_ACTIVITIES,
  buildEventOccurrences,
  type ActivitySeed,
  type EventFormData,
  type EventListing,
  type EventStats,
  type Venue,
} from '@community/types';
import { COLLECTIONS } from './collections';

export type ActivityOption = Pick<ActivitySeed, 'id' | 'label' | 'color'>;

export interface PerkCounts {
  /** People who arrived and unlocked the perk */
  unlocked: number;
  /** Of those, how many had it redeemed at the bar */
  redeemed: number;
}

// An event that started up to this long ago may still be running
const LONGEST_EVENT_MS = 12 * 60 * 60 * 1000;
const MAX_EVENTS_LISTED = 300;

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
 * A host posting their own event confirms it by posting. An admin posting
 * for a host confirms it only if the host has told them it is right.
 */
const isConfirmed = (form: EventFormData): boolean =>
  !form.onBehalf || form.onBehalf.confirmedByHost;

const toEvent = (item: { id: string; data: () => unknown }): EventListing =>
  ({ ...(item.data() as object), id: item.id }) as EventListing;

export const createEventStore = (db: Firestore) => {
  const events = () => collection(db, COLLECTIONS.EVENTS);

  /**
   * Activities to choose from. Falls back to the starting set when the
   * collection hasn't been seeded yet.
   */
  const loadActivityOptions = async (): Promise<ActivityOption[]> => {
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
  };

  const loadApprovedVenues = async (): Promise<Venue[]> => {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.VENUES), where('moderationStatus', '==', 'approved')),
    );
    return snapshot.docs
      .map((item) => ({ ...item.data(), id: item.id }) as Venue)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const loadMyEvents = async (organizerId: string): Promise<EventListing[]> => {
    const snapshot = await getDocs(
      query(events(), where('organizerId', '==', organizerId), orderBy('startsAt', 'desc')),
    );
    return snapshot.docs.map(toEvent);
  };

  /** Every organizer's events that are running or still to come, soonest first */
  const loadUpcomingEvents = async (nowMs: number): Promise<EventListing[]> => {
    const snapshot = await getDocs(
      query(
        events(),
        where('startsAt', '>=', Timestamp.fromMillis(nowMs - LONGEST_EVENT_MS)),
        orderBy('startsAt', 'asc'),
        limit(MAX_EVENTS_LISTED),
      ),
    );
    return snapshot.docs.map(toEvent).filter((event) => event.endsAt.toMillis() > nowMs);
  };

  const loadEvent = async (eventId: string): Promise<EventListing | null> => {
    const snapshot = await getDoc(doc(events(), eventId));
    return snapshot.exists() ? toEvent(snapshot) : null;
  };

  /**
   * Publishes the event, one document per occurrence when it repeats.
   * Returns how many were created.
   */
  const createEvents = async (
    form: EventFormData,
    venue: Venue,
    organizerId: string,
  ): Promise<number> => {
    const occurrences = buildEventOccurrences(form, () => doc(events()).id);
    const batch = writeBatch(db);

    for (const occurrence of occurrences) {
      const ref = doc(events());
      batch.set(ref, {
        id: ref.id,
        ...sharedFields(form, venue),
        organizerId,
        startsAt: Timestamp.fromMillis(occurrence.startsAtMs),
        endsAt: Timestamp.fromMillis(occurrence.endsAtMs),
        ...withoutEmpty({ seriesId: occurrence.seriesId }),
        ...(form.onBehalf
          ? { postedOnBehalfBy: organizerId, detailsSource: form.onBehalf.detailsSource.trim() }
          : {}),
        status: 'scheduled',
        ...(isConfirmed(form) ? { confirmedAt: serverTimestamp() } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return occurrences.length;
  };

  /** Saves changes to a single occurrence */
  const updateEvent = async (eventId: string, form: EventFormData, venue: Venue): Promise<void> => {
    await updateDoc(doc(events(), eventId), {
      ...sharedFields(form, venue),
      startsAt: Timestamp.fromDate(form.startsAt),
      endsAt: Timestamp.fromDate(form.endsAt),
      ...(form.onBehalf ? { detailsSource: form.onBehalf.detailsSource.trim() } : {}),
      confirmedAt: isConfirmed(form) ? serverTimestamp() : deleteField(),
      updatedAt: serverTimestamp(),
    });
  };

  const setEventStatus = async (eventId: string, status: EventListing['status']): Promise<void> => {
    await updateDoc(doc(events(), eventId), { status, updatedAt: serverTimestamp() });
  };

  /** Records that the host says the details are right */
  const confirmEvent = async (eventId: string): Promise<void> => {
    await updateDoc(doc(events(), eventId), {
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const upcomingInSeries = (all: EventListing[], seriesId: string, nowMs: number) =>
    all.filter(
      (event) =>
        event.seriesId === seriesId &&
        event.status === 'scheduled' &&
        event.startsAt.toMillis() > nowMs,
    );

  /** Cancels every occurrence in the series that hasn't started yet */
  const cancelUpcomingInSeries = async (
    all: EventListing[],
    seriesId: string,
    nowMs: number,
  ): Promise<number> => {
    const upcoming = upcomingInSeries(all, seriesId, nowMs);
    const batch = writeBatch(db);
    for (const event of upcoming) {
      batch.update(doc(events(), event.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return upcoming.length;
  };

  /** Records the host's confirmation on every occurrence that hasn't started yet */
  const confirmUpcomingInSeries = async (
    all: EventListing[],
    seriesId: string,
    nowMs: number,
  ): Promise<number> => {
    const upcoming = upcomingInSeries(all, seriesId, nowMs);
    const batch = writeBatch(db);
    for (const event of upcoming) {
      batch.update(doc(events(), event.id), {
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return upcoming.length;
  };

  /**
   * Perk totals for each of the organizer's events, keyed by event ID.
   * These are totals only; who unlocked a perk is never available here.
   */
  const loadPerkCounts = async (organizerId: string): Promise<Record<string, PerkCounts>> => {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.EVENT_STATS), where('organizerId', '==', organizerId)),
    );

    const counts: Record<string, PerkCounts> = {};
    for (const item of snapshot.docs) {
      const stats = item.data() as EventStats;
      counts[item.id] = { unlocked: stats.perkUnlocked ?? 0, redeemed: stats.perkRedeemed ?? 0 };
    }
    return counts;
  };

  return {
    loadActivityOptions,
    loadApprovedVenues,
    loadMyEvents,
    loadUpcomingEvents,
    loadEvent,
    createEvents,
    updateEvent,
    setEventStatus,
    confirmEvent,
    cancelUpcomingInSeries,
    confirmUpcomingInSeries,
    loadPerkCounts,
  };
};

export type EventStore = ReturnType<typeof createEventStore>;
