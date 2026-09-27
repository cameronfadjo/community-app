/**
 * Script to load venues from a list, waiting for approval
 *
 * Each venue is added as "waiting" and unverified. Addresses and map
 * positions in the list were looked up, not confirmed. An admin checks
 * them, marks the venue verified, and approves it in the dashboard.
 * Events can't be posted at a venue until that is done.
 *
 * Only adds venues that don't exist yet, so it is safe to run again and
 * never overwrites edits an admin has made.
 *
 * Usage:
 *   pnpm --filter @community/admin-dashboard seed:venues --dry-run
 *   pnpm --filter @community/admin-dashboard seed:venues
 *   pnpm --filter @community/admin-dashboard seed:venues --town "New Haven"
 *
 * Requirements (not needed for --dry-run):
 *   - Service account key JSON file
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set to its path
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { buildVenueLead, parseCsv, type VenueLeadSeed } from '@community/types';
import { COLLECTIONS } from '@community/firebase';

const LIST = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'launch-connecticut',
  'venues.csv'
);
const STATE = 'CT';
const SOURCE = 'LGBTQ+ CT Resources by @queerct';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const townIndex = args.indexOf('--town');
const town = townIndex >= 0 ? args[townIndex + 1] : undefined;

const readLeads = (): VenueLeadSeed[] => {
  const leads = parseCsv(readFileSync(LIST, 'utf8'))
    .map((row) => buildVenueLead(row, { state: STATE, source: SOURCE }))
    .filter((lead): lead is VenueLeadSeed => lead !== null)
    .filter((lead) => !town || lead.location.city.toLowerCase() === town.toLowerCase());

  const ids = new Set<string>();
  for (const lead of leads) {
    if (ids.has(lead.id)) {
      throw new Error(`Two venues in the list would share the ID ${lead.id}`);
    }
    ids.add(lead.id);
  }
  return leads;
};

const main = async () => {
  if (townIndex >= 0 && !town) {
    console.error('❌ Error: --town needs a name, such as --town "New Haven"');
    process.exit(1);
  }

  const leads = readLeads();

  if (dryRun) {
    console.log(`Dry run: ${leads.length} venues would be checked\n`);
    for (const lead of leads) {
      const address = lead.location.address || '(no address yet)';
      const position = lead.location.coordinates ? 'has position' : 'no position';
      console.log(
        `  ${lead.name.padEnd(42)} ${lead.location.city.padEnd(16)} ${lead.category.padEnd(16)} ${position.padEnd(13)} ${address}`
      );
    }
    return;
  }

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    console.log('\nPlease set it to the path of your service account JSON file:');
    console.log('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"\n');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log(`✅ Firebase Admin initialized for project ${serviceAccount.project_id}\n`);

  const collection = admin.firestore().collection(COLLECTIONS.VENUES);
  let added = 0;

  for (const lead of leads) {
    const ref = collection.doc(lead.id);
    if ((await ref.get()).exists) {
      console.log(`  skipped  ${lead.name} (already exists)`);
      continue;
    }

    const { coordinates } = lead.location;
    await ref.set({
      ...lead,
      location: {
        ...lead.location,
        coordinates: coordinates
          ? new admin.firestore.GeoPoint(coordinates.latitude, coordinates.longitude)
          : null,
      },
      submittedBy: 'import',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  added    ${lead.name}`);
    added += 1;
  }

  console.log(`\n🎉 Done. Added ${added}, skipped ${leads.length - added}.`);
  console.log('Each venue is waiting and unverified. Check its details, mark it verified, then approve it.');
};

main().catch((error) => {
  console.error('❌ Error loading venues:', error.message);
  process.exit(1);
});
