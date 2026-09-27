import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { isOpenForEvents } from '@community/types';
import {
  aVenue,
  asAdmin,
  asPartner,
  asPerson,
  asSignedOut,
  seed,
  startRules,
  withoutFields,
} from './helpers';

let env: RulesTestEnvironment;

const waiting = aVenue({ id: 'venue_waiting', moderationStatus: 'pending', detailsVerified: false });
const noPosition = aVenue({
  id: 'venue_no_position',
  moderationStatus: 'pending',
  detailsVerified: false,
  location: { ...aVenue().location, address: '', coordinates: null },
});
// Approved in an earlier version of the app, before verifying existed
const neverChecked = withoutFields(aVenue({ id: 'venue_old' }), 'detailsVerified');

beforeAll(async () => {
  env = await startRules();
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'venues/venue_open': aVenue(),
    'venues/venue_waiting': waiting,
    'venues/venue_no_position': noPosition,
    'venues/venue_old': neverChecked,
  });
});

const approved = (database: Firestore) =>
  query(collection(database, 'venues'), where('moderationStatus', '==', 'approved'));

describe('reading venues', () => {
  it('lets anyone read an approved venue, and list the approved ones', async () => {
    await assertSucceeds(getDoc(doc(asSignedOut(env), 'venues/venue_open')));

    const list = await assertSucceeds(getDocs(approved(asPartner(env))));
    expect(list.docs.map((item) => item.id).sort()).toEqual(['venue_old', 'venue_open']);
  });

  it('keeps venues that are waiting out of sight', async () => {
    await assertFails(getDoc(doc(asSignedOut(env), 'venues/venue_waiting')));
    await assertFails(getDoc(doc(asPartner(env), 'venues/venue_waiting')));
    await assertFails(getDocs(collection(asSignedOut(env), 'venues')));
    await assertFails(getDocs(collection(asPartner(env), 'venues')));
    await assertFails(
      getDocs(
        query(collection(asPartner(env), 'venues'), where('moderationStatus', '==', 'pending'))
      )
    );
  });

  it('lets an admin read them all', async () => {
    const list = await assertSucceeds(getDocs(collection(asAdmin(env), 'venues')));
    expect(list.size).toBe(4);
  });

  it('offers partners only venues that were verified', async () => {
    const list = await getDocs(approved(asPartner(env)));
    const offered = list.docs
      .map((item) => item.data() as Parameters<typeof isOpenForEvents>[0] & { id: string })
      .filter(isOpenForEvents)
      .map((venue) => venue.id);
    expect(offered).toEqual(['venue_open']);
  });
});

describe('adding and changing venues', () => {
  const adding = aVenue({
    id: 'venue_new',
    moderationStatus: 'pending',
    detailsVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it('is for admins only', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(env), 'venues/venue_new'), adding));

    await assertFails(setDoc(doc(asPartner(env), 'venues/venue_new_2'), adding));
    await assertFails(setDoc(doc(asPerson(env), 'venues/venue_new_2'), adding));
    await assertFails(setDoc(doc(asSignedOut(env), 'venues/venue_new_2'), adding));
    await assertFails(updateDoc(doc(asPartner(env), 'venues/venue_open'), { name: 'Mine now' }));
    await assertFails(updateDoc(doc(asPartner(env), 'venues/venue_open'), { featured: true }));
    await assertFails(deleteDoc(doc(asPartner(env), 'venues/venue_open')));
  });

  it('lets an admin save a venue that is still missing its address and position', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(env), 'venues/venue_new'), {
        ...adding,
        location: { ...adding.location, address: '', coordinates: null },
      })
    );
  });

  it('lets an admin delete one', async () => {
    await assertSucceeds(deleteDoc(doc(asAdmin(env), 'venues/venue_waiting')));
  });
});

describe('approving a venue', () => {
  it('is refused until the venue has been verified', async () => {
    await assertFails(
      updateDoc(doc(asAdmin(env), 'venues/venue_waiting'), { moderationStatus: 'approved' })
    );
  });

  it('works once it has been verified', async () => {
    const venue = doc(asAdmin(env), 'venues/venue_waiting');
    await assertSucceeds(
      updateDoc(venue, {
        detailsVerified: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: 'admin_1',
      })
    );
    await assertSucceeds(updateDoc(venue, { moderationStatus: 'approved' }));
  });

  it('is refused for a venue with no address or map position, even if marked verified', async () => {
    const venue = doc(asAdmin(env), 'venues/venue_no_position');
    await assertSucceeds(updateDoc(venue, { detailsVerified: true }));
    await assertFails(updateDoc(venue, { moderationStatus: 'approved' }));
  });

  it('cannot be added already approved without being verified', async () => {
    await assertFails(
      setDoc(
        doc(asAdmin(env), 'venues/venue_new'),
        aVenue({ id: 'venue_new', detailsVerified: false })
      )
    );
  });
});

describe('venues approved before verifying existed', () => {
  it('can be moved back to waiting, all at once', async () => {
    const database = asAdmin(env);
    const batch = writeBatch(database);
    batch.update(doc(database, 'venues/venue_old'), {
      moderationStatus: 'pending',
      featured: false,
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('can be verified where they stand', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), 'venues/venue_old'), {
        detailsVerified: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: 'admin_1',
      })
    );
  });

  it('cannot be featured until then', async () => {
    await assertFails(updateDoc(doc(asAdmin(env), 'venues/venue_old'), { featured: true }));
  });
});
