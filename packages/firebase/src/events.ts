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
  setDoc,
  deleteDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  DEFAULT_ACTIVITIES,
  buildEventOccurrences,
  getClaimId,
  isOpenForEvents,
  type ActivitySeed,
  type ClaimableGroup,
  type EventClaim,
  type EventFormData,
  type EventListing,
  type EventStats,
  type SignalDay,
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

  /**
   * Venues events can be posted at. Approved alone is not enough: a venue
   * approved before verifying existed was never checked, so it is left out
   * until an admin verifies it.
   */
  const loadApprovedVenues = async (): Promise<Venue[]> => {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.VENUES), where('moderationStatus', '==', 'approved')),
    );
    return snapshot.docs
      .map((item) => ({ ...item.data(), id: item.id }) as Venue)
      .filter(isOpenForEvents)
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

  const claims = () => collection(db, COLLECTIONS.EVENT_CLAIMS);

  const toClaim = (item: { id: string; data: () => unknown }): EventClaim =>
    ({ ...(item.data() as object), id: item.id }) as EventClaim;

  const newestFirst = (a: EventClaim, b: EventClaim) =>
    (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);

  /** A host asks to take over an event, or every date of a repeating one */
  const createClaim = async (
    group: ClaimableGroup,
    partner: { uid: string; email: string },
    form: { note: string; detailsCorrect: boolean },
  ): Promise<void> => {
    const id = getClaimId(group.claimKey, partner.uid);
    await setDoc(doc(claims(), id), {
      id,
      claimKey: group.claimKey,
      eventTitle: group.title,
      venueName: group.venueName,
      ...withoutEmpty({ organizerName: group.organizerName }),
      partnerId: partner.uid,
      partnerEmail: partner.email,
      note: form.note.trim(),
      detailsCorrect: form.detailsCorrect,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  };

  const loadMyClaims = async (partnerId: string): Promise<EventClaim[]> => {
    const snapshot = await getDocs(query(claims(), where('partnerId', '==', partnerId)));
    return snapshot.docs.map(toClaim).sort(newestFirst);
  };

  /** A host takes back a claim nobody has decided yet */
  const withdrawClaim = async (claimId: string): Promise<void> => {
    await deleteDoc(doc(claims(), claimId));
  };

  const loadClaims = async (status: EventClaim['status']): Promise<EventClaim[]> => {
    const snapshot = await getDocs(query(claims(), where('status', '==', status)));
    return snapshot.docs.map(toClaim).sort(newestFirst);
  };

  /** The dates a claim covers that an admin still holds and that haven't started */
  const loadEventsForClaim = async (claimKey: string, nowMs: number): Promise<EventListing[]> => {
    const [series, single] = await Promise.all([
      getDocs(query(events(), where('seriesId', '==', claimKey))),
      getDoc(doc(events(), claimKey)),
    ]);
    const found = series.docs.map(toEvent);
    if (single.exists()) {
      found.push(toEvent(single));
    }
    return found.filter(
      (event) =>
        Boolean(event.postedOnBehalfBy) &&
        event.status === 'scheduled' &&
        event.startsAt.toMillis() > nowMs,
    );
  };

  /**
   * Hands the claimed events over to the host and records the decision.
   * Perk totals move with them, since a host can read only the totals
   * that carry their ID. The host confirms the details by claiming only if
   * they said the details are right. Returns how many dates were handed over.
   */
  const approveClaim = async (claim: EventClaim, adminId: string, nowMs: number): Promise<number> => {
    const covered = await loadEventsForClaim(claim.claimKey, nowMs);
    const stats = await Promise.all(
      covered.map((event) => getDoc(doc(db, COLLECTIONS.EVENT_STATS, event.id))),
    );
    const batch = writeBatch(db);

    // An event has totals only once someone has unlocked its perk
    for (const total of stats.filter((item) => item.exists())) {
      batch.update(total.ref, { organizerId: claim.partnerId, updatedAt: serverTimestamp() });
    }

    for (const event of covered) {
      batch.update(doc(events(), event.id), {
        organizerId: claim.partnerId,
        postedOnBehalfBy: deleteField(),
        handedOverAt: serverTimestamp(),
        ...(claim.detailsCorrect ? { confirmedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      });
    }
    batch.update(doc(claims(), claim.id), {
      status: 'approved',
      decidedAt: serverTimestamp(),
      decidedBy: adminId,
    });

    await batch.commit();
    return covered.length;
  };

  const rejectClaim = async (claimId: string, adminId: string): Promise<void> => {
    await updateDoc(doc(claims(), claimId), {
      status: 'rejected',
      decidedAt: serverTimestamp(),
      decidedBy: adminId,
    });
  };

  /**
   * The anonymous counts for one event, one entry per day it was looked at.
   * Hosts can read these for their own events only.
   */
  const loadSignalDays = async (eventId: string): Promise<SignalDay[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.EVENT_SIGNALS, eventId, 'days'));
    return snapshot.docs.map((item) => ({ ...item.data(), day: item.id, eventId }) as SignalDay);
  };

  return {
    loadSignalDays,
    createClaim,
    loadMyClaims,
    withdrawClaim,
    loadClaims,
    approveClaim,
    rejectClaim,
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
