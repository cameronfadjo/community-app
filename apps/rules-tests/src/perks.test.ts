import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
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
  type Firestore,
} from 'firebase/firestore';
import {
  PERK_WINDOW_MINUTES,
  getPerkRecordDeleteAtMs,
  getPerkRedemptionId,
} from '@community/types';
import {
  DAY,
  HOUR,
  MINUTE,
  anEvent,
  asAdmin,
  asPartner,
  asPerson,
  asSignedOut,
  seed,
  startRules,
  withoutFields,
} from './helpers';

let env: RulesTestEnvironment;
const event = anEvent();

beforeAll(async () => {
  env = await startRules();
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'events/event_1': event,
    'events/event_no_perk': withoutFields(anEvent({ id: 'event_no_perk' }), 'perkLabel'),
    'events/event_cancelled': anEvent({ id: 'event_cancelled', status: 'cancelled' }),
    'events/event_over': anEvent({
      id: 'event_over',
      startsAt: Timestamp.fromMillis(Date.now() - 5 * HOUR),
      endsAt: Timestamp.fromMillis(Date.now() - HOUR),
    }),
    'users/person_1': {
      uid: 'person_1',
      email: 'person_1@example.com',
      displayName: 'Sam',
      moderationStatus: 'approved',
    },
    'users/person_blocked': {
      uid: 'person_blocked',
      email: 'person_blocked@example.com',
      displayName: 'Alex',
      moderationStatus: 'rejected',
    },
  });
});

const perkRecord = (database: Firestore, uid: string, eventId = 'event_1') =>
  doc(database, 'perkRedemptions', getPerkRedemptionId(eventId, uid));

/** What the app sends when someone unlocks a perk at the door */
const unlocking = (uid: string, of: ReturnType<typeof anEvent> = event) => ({
  id: getPerkRedemptionId(of.id, uid),
  eventId: of.id,
  userId: uid,
  perkLabel: of.perkLabel,
  eventTitle: of.title,
  venueName: of.venueName,
  unlockedAt: serverTimestamp(),
  expiresAt: Timestamp.fromMillis(Date.now() + PERK_WINDOW_MINUTES * MINUTE),
  deleteAt: Timestamp.fromMillis(getPerkRecordDeleteAtMs(of.endsAt.toMillis())),
});

describe('unlocking a perk', () => {
  it('lets someone unlock a perk for themselves', async () => {
    await assertSucceeds(setDoc(perkRecord(asPerson(env), 'person_1'), unlocking('person_1')));
  });

  it('works for someone whose profile has not been made yet', async () => {
    await assertSucceeds(setDoc(perkRecord(asPerson(env, 'person_new'), 'person_new'), unlocking('person_new')));
  });

  it('refuses someone who is signed out', async () => {
    await assertFails(setDoc(perkRecord(asSignedOut(env), 'person_1'), unlocking('person_1')));
  });

  it('refuses unlocking in someone else\'s name', async () => {
    await assertFails(setDoc(perkRecord(asPerson(env, 'person_2'), 'person_1'), unlocking('person_1')));
  });

  it('refuses an account an admin has blocked', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env, 'person_blocked'), 'person_blocked'), unlocking('person_blocked'))
    );
  });

  it('refuses a perk the event does not offer', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), {
        ...unlocking('person_1'),
        perkLabel: 'Free bottle of champagne',
      })
    );
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1', 'event_no_perk'), {
        ...unlocking('person_1'),
        id: getPerkRedemptionId('event_no_perk', 'person_1'),
        eventId: 'event_no_perk',
      })
    );
  });

  it('refuses an event that was cancelled, is over, or does not exist', async () => {
    for (const eventId of ['event_cancelled', 'event_over', 'made_up']) {
      await assertFails(
        setDoc(perkRecord(asPerson(env), 'person_1', eventId), {
          ...unlocking('person_1'),
          id: getPerkRedemptionId(eventId, 'person_1'),
          eventId,
          deleteAt: Timestamp.fromMillis(Date.now() + 30 * DAY),
        })
      );
    }
  });

  it('refuses a window longer than the app gives', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), {
        ...unlocking('person_1'),
        expiresAt: Timestamp.fromMillis(Date.now() + 3 * HOUR),
      })
    );
  });

  it('refuses a perk that arrives already used', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), {
        ...unlocking('person_1'),
        redeemedAt: serverTimestamp(),
      })
    );
  });
});

describe('the date a perk record is deleted', () => {
  it('refuses a record without one', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), withoutFields(unlocking('person_1'), 'deleteAt'))
    );
  });

  it('refuses one that keeps the record much longer than thirty days', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), {
        ...unlocking('person_1'),
        deleteAt: Timestamp.fromMillis(event.endsAt.toMillis() + 365 * DAY),
      })
    );
  });

  it('refuses one that is not a date', async () => {
    await assertFails(
      setDoc(perkRecord(asPerson(env), 'person_1'), { ...unlocking('person_1'), deleteAt: 'never' })
    );
  });

  it('still unlocks when the end time changed by a few hours since the app loaded it', async () => {
    await assertSucceeds(
      setDoc(perkRecord(asPerson(env), 'person_1'), {
        ...unlocking('person_1'),
        deleteAt: Timestamp.fromMillis(getPerkRecordDeleteAtMs(event.endsAt.toMillis()) + 3 * HOUR),
      })
    );
  });
});

describe('using a perk', () => {
  beforeEach(async () => {
    await setDoc(perkRecord(asPerson(env), 'person_1'), unlocking('person_1'));
  });

  it('can be used once', async () => {
    const record = perkRecord(asPerson(env), 'person_1');
    await assertSucceeds(updateDoc(record, { redeemedAt: serverTimestamp() }));
    await assertFails(updateDoc(record, { redeemedAt: serverTimestamp() }));
  });

  it('refuses any other change', async () => {
    const record = perkRecord(asPerson(env), 'person_1');
    await assertFails(updateDoc(record, { perkLabel: 'Free bottle of champagne' }));
    await assertFails(
      updateDoc(record, {
        redeemedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + DAY),
      })
    );
    await assertFails(updateDoc(record, { deleteAt: Timestamp.fromMillis(Date.now() + 365 * DAY) }));
  });

  it('refuses someone else using it', async () => {
    await assertFails(
      updateDoc(perkRecord(asPerson(env, 'person_2'), 'person_1'), { redeemedAt: serverTimestamp() })
    );
  });

  it('cannot be deleted by anyone, so it cannot be unlocked twice', async () => {
    await assertFails(deleteDoc(perkRecord(asPerson(env), 'person_1')));
    await assertFails(deleteDoc(perkRecord(asPartner(env), 'person_1')));
  });
});

describe('who can see a perk record', () => {
  beforeEach(async () => {
    await setDoc(perkRecord(asPerson(env), 'person_1'), unlocking('person_1'));
  });

  const mine = (database: Firestore, uid: string) =>
    query(collection(database, 'perkRedemptions'), where('userId', '==', uid));

  it('lets the person see their own', async () => {
    const found = await assertSucceeds(getDoc(perkRecord(asPerson(env), 'person_1')));
    expect(found.exists()).toBe(true);

    const list = await assertSucceeds(getDocs(mine(asPerson(env), 'person_1')));
    expect(list.size).toBe(1);
  });

  it('lets the app look for a perk the person has not unlocked yet', async () => {
    const found = await assertSucceeds(
      getDoc(perkRecord(asPerson(env, 'person_2'), 'person_2'))
    );
    expect(found.exists()).toBe(false);
  });

  it('refuses everyone else, including the host', async () => {
    await assertFails(getDoc(perkRecord(asPerson(env, 'person_2'), 'person_1')));
    await assertFails(getDoc(perkRecord(asPartner(env, 'partner_1'), 'person_1')));
    await assertFails(getDoc(perkRecord(asSignedOut(env), 'person_1')));
    await assertFails(getDocs(mine(asPartner(env, 'partner_1'), 'person_1')));
    await assertFails(getDocs(collection(asPerson(env), 'perkRedemptions')));
  });

  it('lets an admin see it', async () => {
    await assertSucceeds(getDoc(perkRecord(asAdmin(env), 'person_1')));
  });
});
