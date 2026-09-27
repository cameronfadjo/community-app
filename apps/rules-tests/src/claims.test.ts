import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
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
import { MAX_CLAIM_NOTE_LENGTH, getClaimId } from '@community/types';
import {
  anEvent,
  anEventPostedForAHost,
  asAdmin,
  asPartner,
  asPerson,
  asSignedOut,
  readBack,
  seed,
  startRules,
} from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await startRules();
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'events/event_1': anEvent(),
    'events/event_for_host': anEventPostedForAHost(),
    'eventStats/event_1': {
      eventId: 'event_1',
      organizerId: 'partner_1',
      perkUnlocked: 6,
      perkRedeemed: 5,
    },
    'eventStats/event_for_host': {
      eventId: 'event_for_host',
      organizerId: 'admin_1',
      perkUnlocked: 3,
      perkRedeemed: 2,
    },
  });
});

const claimRecord = (database: Firestore, uid: string, claimKey = 'event_for_host') =>
  doc(database, 'eventClaims', getClaimId(claimKey, uid));

/** What the partner dashboard sends when a host claims an event */
const claiming = (uid: string, overrides: Record<string, unknown> = {}) => ({
  id: getClaimId('event_for_host', uid),
  claimKey: 'event_for_host',
  eventTitle: 'Friday drag show',
  venueName: 'Chez Est',
  organizerName: 'Trans Haven',
  partnerId: uid,
  partnerEmail: `${uid}@example.com`,
  note: 'I organize this for Trans Haven.',
  detailsCorrect: true,
  status: 'pending',
  createdAt: serverTimestamp(),
  ...overrides,
});

describe('a host claiming an event', () => {
  it('can ask for themselves', async () => {
    await assertSucceeds(setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1')));
  });

  it('needs the partner role', async () => {
    await assertFails(setDoc(claimRecord(asPerson(env, 'partner_1'), 'partner_1'), claiming('partner_1')));
    await assertFails(setDoc(claimRecord(asSignedOut(env), 'partner_1'), claiming('partner_1')));
  });

  it('cannot ask in someone else\'s name, or give someone else\'s email', async () => {
    await assertFails(setDoc(claimRecord(asPartner(env, 'partner_2'), 'partner_1'), claiming('partner_1')));
    await assertFails(
      setDoc(
        claimRecord(asPartner(env), 'partner_1'),
        claiming('partner_1', { partnerEmail: 'someone.else@example.com' })
      )
    );
  });

  it('cannot approve their own claim', async () => {
    await assertFails(
      setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1', { status: 'approved' }))
    );

    await assertSucceeds(setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1')));
    await assertFails(updateDoc(claimRecord(asPartner(env), 'partner_1'), { status: 'approved' }));
  });

  it('must say how they are involved, briefly', async () => {
    await assertFails(
      setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1', { note: '' }))
    );
    await assertFails(
      setDoc(
        claimRecord(asPartner(env), 'partner_1'),
        claiming('partner_1', { note: 'x'.repeat(MAX_CLAIM_NOTE_LENGTH + 1) })
      )
    );
  });

  it('can take back a claim nobody has decided, and not one that has been', async () => {
    const mine = claimRecord(asPartner(env), 'partner_1');
    await assertSucceeds(setDoc(mine, claiming('partner_1')));
    await assertSucceeds(deleteDoc(mine));

    await assertSucceeds(setDoc(mine, claiming('partner_1')));
    await assertSucceeds(updateDoc(claimRecord(asAdmin(env), 'partner_1'), { status: 'rejected' }));
    await assertFails(deleteDoc(mine));
  });
});

describe('who can see a claim', () => {
  beforeEach(async () => {
    await setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1'));
  });

  it('lets the host see their own', async () => {
    const database = asPartner(env, 'partner_1');
    const list = await assertSucceeds(
      getDocs(query(collection(database, 'eventClaims'), where('partnerId', '==', 'partner_1')))
    );
    expect(list.size).toBe(1);
  });

  it('refuses other hosts and everyone else', async () => {
    await assertFails(getDoc(claimRecord(asPartner(env, 'partner_2'), 'partner_1')));
    await assertFails(getDocs(collection(asPartner(env, 'partner_2'), 'eventClaims')));
    await assertFails(getDoc(claimRecord(asSignedOut(env), 'partner_1')));
  });

  it('lets an admin list the ones that are waiting', async () => {
    const list = await assertSucceeds(
      getDocs(query(collection(asAdmin(env), 'eventClaims'), where('status', '==', 'pending')))
    );
    expect(list.size).toBe(1);
  });
});

describe('handing an event over', () => {
  beforeEach(async () => {
    await setDoc(claimRecord(asPartner(env), 'partner_1'), claiming('partner_1'));
  });

  it('moves the event, its totals, and the claim in one go', async () => {
    const database = asAdmin(env);
    const batch = writeBatch(database);
    batch.update(doc(database, 'eventStats/event_for_host'), {
      organizerId: 'partner_1',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(database, 'events/event_for_host'), {
      organizerId: 'partner_1',
      postedOnBehalfBy: deleteField(),
      handedOverAt: serverTimestamp(),
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(claimRecord(database, 'partner_1'), {
      status: 'approved',
      decidedAt: serverTimestamp(),
      decidedBy: 'admin_1',
    });
    await assertSucceeds(batch.commit());

    const event = await readBack(env, 'events/event_for_host');
    expect(event?.organizerId).toBe('partner_1');
    expect(event).not.toHaveProperty('postedOnBehalfBy');

    // The host can now see the totals that came with it
    const totals = await assertSucceeds(
      getDocs(
        query(
          collection(asPartner(env, 'partner_1'), 'eventStats'),
          where('organizerId', '==', 'partner_1')
        )
      )
    );
    expect(totals.docs.map((item) => item.id).sort()).toEqual(['event_1', 'event_for_host']);
  });
});

describe('perk totals', () => {
  it('can be read by the host they belong to, and nobody else', async () => {
    await assertSucceeds(getDoc(doc(asPartner(env, 'partner_1'), 'eventStats/event_1')));

    await assertFails(getDoc(doc(asPartner(env, 'partner_2'), 'eventStats/event_1')));
    await assertFails(getDoc(doc(asPartner(env, 'partner_1'), 'eventStats/event_for_host')));
    await assertFails(getDoc(doc(asSignedOut(env), 'eventStats/event_1')));
    await assertFails(getDocs(collection(asPartner(env, 'partner_1'), 'eventStats')));
  });

  it('cannot have their numbers changed by anyone, admins included', async () => {
    await assertFails(updateDoc(doc(asAdmin(env), 'eventStats/event_1'), { perkRedeemed: 500 }));
    await assertFails(updateDoc(doc(asPartner(env), 'eventStats/event_1'), { perkRedeemed: 500 }));
    await assertFails(
      updateDoc(doc(asAdmin(env), 'eventStats/event_1'), {
        organizerId: 'partner_2',
        perkUnlocked: 500,
      })
    );
  });

  it('cannot be made up or removed', async () => {
    await assertFails(
      setDoc(doc(asAdmin(env), 'eventStats/event_new'), {
        eventId: 'event_new',
        organizerId: 'partner_1',
        perkUnlocked: 500,
        perkRedeemed: 500,
      })
    );
    await assertFails(deleteDoc(doc(asAdmin(env), 'eventStats/event_1')));
  });
});
