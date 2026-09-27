import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  HOUR,
  anEvent,
  anEventPostedForAHost,
  asAdmin,
  asPartner,
  asPerson,
  asSignedOut,
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

const ages = (minimumAge: number) => ({ ...anEvent().tags, minimumAge });

describe('browsing events', () => {
  it('needs no account', async () => {
    await assertSucceeds(getDoc(doc(asSignedOut(env), 'events/event_1')));
    await assertSucceeds(getDocs(collection(asSignedOut(env), 'events')));
  });
});

describe('a partner posting an event', () => {
  const posting = (overrides: Record<string, unknown> = {}) =>
    anEvent({ id: 'event_new', organizerId: 'partner_1', ...overrides });

  it('can post their own, for 18 and over or 21 and over', async () => {
    await assertSucceeds(setDoc(doc(asPartner(env), 'events/event_new'), posting()));
    await assertSucceeds(
      setDoc(doc(asPartner(env), 'events/event_new_18'), posting({ id: 'event_new_18', tags: ages(18) }))
    );
  });

  it('cannot post an event open to under-18s', async () => {
    for (const minimumAge of [0, 13, 17]) {
      await assertFails(
        setDoc(doc(asPartner(env), 'events/event_new'), posting({ tags: ages(minimumAge) }))
      );
    }
  });

  it('cannot post in someone else\'s name', async () => {
    await assertFails(
      setDoc(doc(asPartner(env), 'events/event_new'), posting({ organizerId: 'partner_2' }))
    );
  });

  it('cannot mark an event as posted for a host, which only admins do', async () => {
    await assertFails(
      setDoc(doc(asPartner(env), 'events/event_new'), posting({ postedOnBehalfBy: 'partner_1' }))
    );
  });

  it('cannot post an event with no activity, or that ends before it starts', async () => {
    await assertFails(
      setDoc(doc(asPartner(env), 'events/event_new'), posting({ activityIds: [] }))
    );
    await assertFails(
      setDoc(
        doc(asPartner(env), 'events/event_new'),
        posting({ endsAt: Timestamp.fromMillis(Date.now() - HOUR) })
      )
    );
  });

  it('is refused for anyone without the partner role', async () => {
    await assertFails(setDoc(doc(asPerson(env, 'partner_1'), 'events/event_new'), posting()));
    await assertFails(setDoc(doc(asSignedOut(env), 'events/event_new'), posting()));
  });
});

describe('a partner changing an event', () => {
  it('can edit and cancel their own', async () => {
    const event = doc(asPartner(env), 'events/event_1');
    await assertSucceeds(updateDoc(event, { title: 'Saturday drag show' }));
    await assertSucceeds(updateDoc(event, { confirmedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(event, { status: 'cancelled' }));
  });

  it('cannot touch someone else\'s', async () => {
    const event = doc(asPartner(env, 'partner_2'), 'events/event_1');
    await assertFails(updateDoc(event, { title: 'Mine now' }));
    await assertFails(updateDoc(event, { organizerId: 'partner_2' }));
    await assertFails(deleteDoc(event));
  });

  it('cannot hand their event to someone else, or open it to under-18s', async () => {
    const event = doc(asPartner(env), 'events/event_1');
    await assertFails(updateDoc(event, { organizerId: 'partner_2' }));
    await assertFails(updateDoc(event, { tags: ages(0) }));
  });

  it('cannot take an event an admin posted for a host', async () => {
    const event = doc(asPartner(env), 'events/event_for_host');
    await assertFails(updateDoc(event, { title: 'Mine now' }));
    await assertFails(
      updateDoc(event, { organizerId: 'partner_1', postedOnBehalfBy: deleteField() })
    );
  });

  it('can delete their own', async () => {
    await assertSucceeds(deleteDoc(doc(asPartner(env), 'events/event_1')));
  });
});

describe('an admin', () => {
  it('can post an event for a host, confirmed or not', async () => {
    await assertSucceeds(
      setDoc(
        doc(asAdmin(env), 'events/event_new'),
        anEventPostedForAHost({ id: 'event_new' })
      )
    );
    await assertSucceeds(
      setDoc(
        doc(asAdmin(env), 'events/event_new_confirmed'),
        anEventPostedForAHost({ id: 'event_new_confirmed', confirmedAt: serverTimestamp() })
      )
    );
  });

  it('cannot post an event open to under-18s either', async () => {
    await assertFails(
      setDoc(
        doc(asAdmin(env), 'events/event_new'),
        anEventPostedForAHost({ id: 'event_new', tags: ages(0) })
      )
    );
  });

  it('can take any event down', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(env), 'events/event_1'), { status: 'cancelled' }));
  });

  it('can hand an event over, after which it is the host\'s to change', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), 'events/event_for_host'), {
        organizerId: 'partner_1',
        postedOnBehalfBy: deleteField(),
        handedOverAt: serverTimestamp(),
      })
    );

    const event = doc(asPartner(env, 'partner_1'), 'events/event_for_host');
    await assertSucceeds(updateDoc(event, { title: 'Nonbinary hangout' }));
    await assertSucceeds(updateDoc(event, { confirmedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(asPartner(env, 'partner_2'), 'events/event_for_host'), { title: 'Mine now' })
    );
  });
});
