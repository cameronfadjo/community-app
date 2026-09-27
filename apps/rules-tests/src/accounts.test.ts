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
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { asAdmin, asPartner, asPerson, asSignedOut, seed, startRules } from './helpers';

let env: RulesTestEnvironment;

const aProfile = (uid: string, overrides: Record<string, unknown> = {}) => ({
  uid,
  email: `${uid}@example.com`,
  displayName: 'Sam',
  moderationStatus: 'approved',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

beforeAll(async () => {
  env = await startRules();
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'users/person_1': aProfile('person_1'),
    'users/person_blocked': aProfile('person_blocked', { moderationStatus: 'rejected' }),
    'activities/dancing': { id: 'dancing', label: 'Dancing', active: true, sortOrder: 10 },
    'reviews/review_1': { userId: 'person_1', venueId: 'venue_open', rating: 5, text: 'Old' },
    'checkIns/checkin_1': { userId: 'person_1', venueId: 'venue_open' },
    'offers/offer_1': { title: 'Old offer' },
  });
});

describe('signing up', () => {
  it('lets the app make a profile for the person who just signed up', async () => {
    const database = asPerson(env, 'person_new');

    // The app looks first, finds nothing, then makes it
    const before = await assertSucceeds(getDoc(doc(database, 'users/person_new')));
    expect(before.exists()).toBe(false);

    await assertSucceeds(setDoc(doc(database, 'users/person_new'), aProfile('person_new')));
    await assertSucceeds(
      updateDoc(doc(database, 'users/person_new'), {
        displayName: 'Sam',
        confirmedAdultAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('refuses a profile for someone else, or one that names someone else', async () => {
    await assertFails(
      setDoc(doc(asPerson(env, 'person_2'), 'users/person_new'), aProfile('person_new'))
    );
    await assertFails(
      setDoc(doc(asPerson(env, 'person_new'), 'users/person_new'), aProfile('person_2'))
    );
    await assertFails(setDoc(doc(asSignedOut(env), 'users/person_new'), aProfile('person_new')));
  });
});

describe('profiles are private', () => {
  it('lets a person read their own', async () => {
    await assertSucceeds(getDoc(doc(asPerson(env, 'person_1'), 'users/person_1')));
  });

  it('refuses everyone else, including venues', async () => {
    await assertFails(getDoc(doc(asSignedOut(env), 'users/person_1')));
    await assertFails(getDoc(doc(asPerson(env, 'person_2'), 'users/person_1')));
    await assertFails(getDoc(doc(asPartner(env), 'users/person_1')));
    await assertFails(getDocs(collection(asPartner(env), 'users')));
    await assertFails(getDocs(collection(asSignedOut(env), 'users')));
  });

  it('lets an admin read them', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(env), 'users')));
  });
});

describe('blocking an account', () => {
  it('is for admins only', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), 'users/person_1'), { moderationStatus: 'rejected' })
    );
    await assertFails(
      updateDoc(doc(asPartner(env), 'users/person_1'), { moderationStatus: 'rejected' })
    );
  });

  it('cannot be undone by the person who was blocked', async () => {
    const database = asPerson(env, 'person_blocked');
    await assertFails(
      updateDoc(doc(database, 'users/person_blocked'), { moderationStatus: 'approved' })
    );
    await assertFails(
      setDoc(doc(database, 'users/person_blocked'), aProfile('person_blocked'))
    );
    await assertFails(deleteDoc(doc(database, 'users/person_blocked')));
  });
});

describe('activities', () => {
  it('can be read by anyone', async () => {
    await assertSucceeds(getDocs(collection(asSignedOut(env), 'activities')));
  });

  it('can be changed by admins only', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(env), 'activities/dancing'), { active: false }));
    await assertFails(updateDoc(doc(asPartner(env), 'activities/dancing'), { active: false }));
    await assertFails(
      setDoc(doc(asPerson(env), 'activities/made-up'), { id: 'made-up', label: 'Made up' })
    );
  });
});

describe('what the app no longer has', () => {
  it('is closed to everyone', async () => {
    for (const path of ['reviews/review_1', 'checkIns/checkin_1', 'offers/offer_1']) {
      await assertFails(getDoc(doc(asSignedOut(env), path)));
      await assertFails(getDoc(doc(asPerson(env, 'person_1'), path)));
      await assertFails(getDoc(doc(asPartner(env), path)));
      await assertFails(updateDoc(doc(asPerson(env, 'person_1'), path), { text: 'New' }));
    }
    await assertFails(
      setDoc(doc(asPerson(env, 'person_1'), 'reviews/review_new'), {
        userId: 'person_1',
        rating: 5,
      })
    );
  });
});
