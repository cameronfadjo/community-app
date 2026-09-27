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
  increment,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { getSignalFields, toDayKey, type SignalKind } from '@community/types';
import {
  DAY,
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
  });
});

const dayRecord = (database: Firestore, eventId: string, day: string) =>
  doc(database, 'eventSignals', eventId, 'days', day);

/** Sends what the app sends when it counts something */
const count = (database: Firestore, kind: SignalKind, when = new Date(), eventId = 'event_1') =>
  setDoc(
    dayRecord(database, eventId, toDayKey(when)),
    {
      eventId,
      day: toDayKey(when),
      ...Object.fromEntries(getSignalFields(kind, when).map((field) => [field, increment(1)])),
    },
    { merge: true }
  );

describe('adding to a count', () => {
  it('lets someone who is signed out count a view', async () => {
    await assertSucceeds(count(asSignedOut(env), 'view'));
  });

  it('lets someone who is signed in count a view', async () => {
    await assertSucceeds(count(asPerson(env), 'view'));
  });

  it('counts directions and going for a perk', async () => {
    await assertSucceeds(count(asSignedOut(env), 'directions'));
    await assertSucceeds(count(asSignedOut(env), 'perkView'));
  });

  it('adds up as more people look', async () => {
    const when = new Date();
    await assertSucceeds(count(asSignedOut(env), 'view', when));
    await assertSucceeds(count(asSignedOut(env), 'view', when));
    await assertSucceeds(count(asSignedOut(env), 'directions', when));

    const stored = await readBack(env, `eventSignals/event_1/days/${toDayKey(when)}`);
    expect(stored).toMatchObject({ eventId: 'event_1', day: toDayKey(when), views: 2, directions: 1 });
    expect(stored?.[getSignalFields('view', when)[1] as string]).toBe(2);
  });

  it('allows for a phone whose clock is a day ahead or behind', async () => {
    await assertSucceeds(count(asSignedOut(env), 'view', new Date(Date.now() + DAY)));
    await assertSucceeds(count(asSignedOut(env), 'view', new Date(Date.now() - DAY)));
  });

  it('stores nothing about who looked', async () => {
    const when = new Date();
    await assertSucceeds(count(asPerson(env, 'person_1'), 'view', when));

    const stored = await readBack(env, `eventSignals/event_1/days/${toDayKey(when)}`);
    expect(JSON.stringify(stored)).not.toContain('person_1');
    expect(Object.keys(stored ?? {}).sort()).toEqual(
      ['day', 'eventId', ...getSignalFields('view', when)].sort()
    );
  });
});

describe('everything else is refused', () => {
  const today = toDayKey(new Date());

  it('refuses a count for an event that does not exist', async () => {
    await assertFails(count(asSignedOut(env), 'view', new Date(), 'made_up'));
  });

  it('refuses adding more than one at a time', async () => {
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_1',
        day: today,
        directions: 50,
      })
    );

    await assertSucceeds(count(asSignedOut(env), 'directions'));
    await assertFails(
      setDoc(
        dayRecord(asSignedOut(env), 'event_1', today),
        { directions: increment(2) },
        { merge: true }
      )
    );
  });

  it('refuses two kinds of count in one go', async () => {
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_1',
        day: today,
        directions: 1,
        perkViews: 1,
      })
    );
  });

  it('refuses a view without its hour, and an hour without a view', async () => {
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_1',
        day: today,
        views: 1,
      })
    );
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_1',
        day: today,
        directions: 1,
        h20: 1,
      })
    );
  });

  it('refuses anything extra, such as who it was', async () => {
    await assertFails(
      setDoc(dayRecord(asPerson(env), 'event_1', today), {
        eventId: 'event_1',
        day: today,
        directions: 1,
        userId: 'person_1',
      })
    );
  });

  it('refuses lowering a count or wiping it', async () => {
    await assertSucceeds(count(asSignedOut(env), 'directions'));
    await assertSucceeds(count(asSignedOut(env), 'directions'));

    const record = dayRecord(asSignedOut(env), 'event_1', today);
    await assertFails(setDoc(record, { directions: increment(-1) }, { merge: true }));
    await assertFails(setDoc(record, { eventId: 'event_1', day: today, directions: 1 }));
    await assertFails(deleteDoc(record));
  });

  it('refuses a count filed under another event or day', async () => {
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_for_host',
        day: today,
        directions: 1,
      })
    );
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', today), {
        eventId: 'event_1',
        day: '2026-01-01',
        directions: 1,
      })
    );
  });

  it('refuses a day long past, far ahead, or not a day at all', async () => {
    await assertFails(count(asSignedOut(env), 'view', new Date(Date.now() - 10 * DAY)));
    await assertFails(count(asSignedOut(env), 'view', new Date(Date.now() + 10 * DAY)));
    await assertFails(
      setDoc(dayRecord(asSignedOut(env), 'event_1', 'today'), {
        eventId: 'event_1',
        day: 'today',
        directions: 1,
      })
    );
  });
});

describe('reading the counts', () => {
  beforeEach(async () => {
    await count(asSignedOut(env), 'view');
    await count(asSignedOut(env), 'view', new Date(), 'event_for_host');
  });

  const days = (database: Firestore, eventId: string) =>
    collection(database, 'eventSignals', eventId, 'days');

  it('lets a host read the counts for their own event', async () => {
    const snapshot = await assertSucceeds(getDocs(days(asPartner(env, 'partner_1'), 'event_1')));
    expect(snapshot.size).toBe(1);
  });

  it('refuses another host', async () => {
    await assertFails(getDocs(days(asPartner(env, 'partner_2'), 'event_1')));
  });

  it('refuses a host reading an event still held by an admin', async () => {
    await assertFails(getDocs(days(asPartner(env, 'partner_1'), 'event_for_host')));
  });

  it('refuses everyone else', async () => {
    const today = toDayKey(new Date());
    await assertFails(getDocs(days(asSignedOut(env), 'event_1')));
    await assertFails(getDocs(days(asPerson(env), 'event_1')));
    await assertFails(getDoc(dayRecord(asSignedOut(env), 'event_1', today)));
  });

  it('lets an admin read any of them', async () => {
    await assertSucceeds(getDocs(days(asAdmin(env), 'event_1')));
    await assertSucceeds(getDocs(days(asAdmin(env), 'event_for_host')));
  });
});
