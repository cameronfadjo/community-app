import {
  GeoPoint,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@community/firebase';
import {
  validateSocialLinks,
  detailsNeedVerifyingAgain,
  getVerificationBlockers,
  parseCoordinates,
  type ModerationStatus,
  type VenueDraft,
  type VenueFormData,
} from '@community/types';
import { db } from '@/lib/firebase/config';

const venues = () => collection(db, COLLECTIONS.VENUES);

export async function loadVenues(filter: ModerationStatus | 'all'): Promise<VenueDraft[]> {
  const q =
    filter === 'all'
      ? query(venues(), orderBy('createdAt', 'desc'))
      : query(venues(), where('moderationStatus', '==', filter), orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as VenueDraft);
}

export async function loadVenue(venueId: string): Promise<VenueDraft | null> {
  const snapshot = await getDoc(doc(venues(), venueId));
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as VenueDraft) : null;
}

/** The stored fields a form produces. Empty optional text is left out. */
const toFields = (form: VenueFormData) => {
  const position = parseCoordinates(form.coordinates);
  const { links } = validateSocialLinks(form.social);
  const contact = {
    ...Object.fromEntries(
      Object.entries({
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
      }).filter(([, value]) => value),
    ),
    ...(Object.keys(links).length > 0 ? { social: links } : {}),
  };

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    location: {
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: 'USA',
      postalCode: form.postalCode.trim(),
      coordinates: position ? new GeoPoint(position.latitude, position.longitude) : null,
    },
    contact,
    accessibility: form.accessibility.trim(),
    notes: form.notes.trim(),
  };
};

/**
 * Adds a venue, waiting for approval and unverified. Whoever adds a venue
 * doesn't verify it in the same step. Returns its ID.
 */
export async function createVenue(form: VenueFormData, adminId: string): Promise<string> {
  const ref = doc(venues());
  await setDoc(ref, {
    id: ref.id,
    ...toFields(form),
    images: [],
    featured: false,
    detailsVerified: false,
    moderationStatus: 'pending',
    submittedBy: adminId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Saves changes to a venue. Changing the name, address, or map position
 * means it has to be verified again, and an approved venue goes back to
 * waiting until it is.
 */
export async function updateVenue(venue: VenueDraft, form: VenueFormData): Promise<void> {
  const verifyAgain = !venue.detailsVerified || detailsNeedVerifyingAgain(venue, form);

  await updateDoc(doc(venues(), venue.id), {
    ...toFields(form),
    ...(verifyAgain
      ? { detailsVerified: false, verifiedAt: deleteField(), verifiedBy: deleteField() }
      : {}),
    moderationStatus:
      venue.moderationStatus === 'approved' && verifyAgain ? 'pending' : venue.moderationStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Records that an admin has checked the name, address, and map position */
export async function verifyVenue(venue: VenueDraft, adminId: string): Promise<void> {
  if (getVerificationBlockers(venue).length > 0) {
    throw new Error('A venue needs an address and a map position before it can be verified');
  }

  await updateDoc(doc(venues(), venue.id), {
    detailsVerified: true,
    verifiedAt: serverTimestamp(),
    verifiedBy: adminId,
    updatedAt: serverTimestamp(),
  });
}

export async function setVenueStatus(venueId: string, status: ModerationStatus): Promise<void> {
  await updateDoc(doc(venues(), venueId), {
    moderationStatus: status,
    updatedAt: serverTimestamp(),
  });
}

export async function setVenueFeatured(venueId: string, featured: boolean): Promise<void> {
  await updateDoc(doc(venues(), venueId), { featured, updatedAt: serverTimestamp() });
}
