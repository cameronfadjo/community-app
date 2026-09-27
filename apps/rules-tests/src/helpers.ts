import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { GeoPoint, Timestamp, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

const RULES = fileURLToPath(new URL('../../community/firestore.rules', import.meta.url));

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Starts a fresh copy of the rules in the emulator */
export const startRules = (): Promise<RulesTestEnvironment> =>
  initializeTestEnvironment({
    projectId: 'demo-community',
    firestore: { rules: readFileSync(RULES, 'utf8') },
  });

// The test library hands back the older style of database object. It works
// with the newer functions the apps use, so it is treated as one.
const modular = (database: unknown): Firestore => database as Firestore;

/** Nobody is signed in */
export const asSignedOut = (env: RulesTestEnvironment): Firestore =>
  modular(env.unauthenticatedContext().firestore());

/** Someone with an account and no role */
export const asPerson = (env: RulesTestEnvironment, uid = 'person_1'): Firestore =>
  modular(env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore());

/** A venue or host */
export const asPartner = (env: RulesTestEnvironment, uid = 'partner_1'): Firestore =>
  modular(
    env.authenticatedContext(uid, { role: 'partner', email: `${uid}@example.com` }).firestore()
  );

export const asAdmin = (env: RulesTestEnvironment, uid = 'admin_1'): Firestore =>
  modular(
    env.authenticatedContext(uid, { role: 'admin', email: `${uid}@example.com` }).firestore()
  );

/** Puts records in place without the rules getting a say, as the starting point for a test */
export const seed = async (
  env: RulesTestEnvironment,
  records: Record<string, Record<string, unknown>>
): Promise<void> => {
  await env.withSecurityRulesDisabled(async (context) => {
    const database = modular(context.firestore());
    await Promise.all(
      Object.entries(records).map(([path, data]) => setDoc(doc(database, path), data))
    );
  });
};

/** Reads a record without the rules getting a say, to check what was stored */
export const readBack = async (
  env: RulesTestEnvironment,
  path: string
): Promise<Record<string, unknown> | undefined> => {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDoc(doc(modular(context.firestore()), path));
    data = snapshot.data();
  });
  return data;
};

const A_PLACE = {
  address: '458 Wethersfield Ave',
  city: 'Hartford',
  state: 'CT',
  country: 'USA',
  postalCode: '06114',
  coordinates: new GeoPoint(41.7446, -72.6717),
};

/** An event that starts in an hour, posted by partner_1, with a perk */
export const anEvent = (overrides: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: 'event_1',
    title: 'Friday drag show',
    description: 'A one-hour show, then dancing until close.',
    activityIds: ['drag-shows'],
    venueId: 'venue_open',
    venueName: 'Chez Est',
    location: A_PLACE,
    organizerId: 'partner_1',
    startsAt: Timestamp.fromMillis(now + HOUR),
    endsAt: Timestamp.fromMillis(now + 4 * HOUR),
    coverCents: 0,
    images: [],
    tags: {
      goodForSolo: true,
      firstTimersWelcome: true,
      alcoholFree: false,
      stepFreeEntry: true,
      minimumAge: 21,
    },
    audience: [],
    perkLabel: 'Free drink',
    status: 'scheduled',
    confirmedAt: Timestamp.fromMillis(now),
    ...overrides,
  };
};

/** An event an admin posted for a host who has no account yet */
export const anEventPostedForAHost = (overrides: Record<string, unknown> = {}) => {
  const { confirmedAt: _unconfirmed, ...event } = anEvent({
    id: 'event_for_host',
    organizerId: 'admin_1',
    organizerName: 'Trans Haven',
    postedOnBehalfBy: 'admin_1',
    detailsSource: 'LGBTQ+ CT Resources',
  });
  return { ...event, ...overrides };
};

/** A venue that is approved, verified, and has a map position */
export const aVenue = (overrides: Record<string, unknown> = {}) => ({
  id: 'venue_open',
  name: 'Chez Est',
  description: 'Restaurant, bar, and cabaret.',
  category: 'bar',
  location: A_PLACE,
  contact: {},
  images: [],
  featured: false,
  detailsVerified: true,
  moderationStatus: 'approved',
  submittedBy: 'admin_1',
  ...overrides,
});

export const withoutFields = <T extends Record<string, unknown>>(
  record: T,
  ...fields: string[]
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !fields.includes(key)));
