/**
 * Script to add the starting set of activities (dancing, drag shows, ...)
 *
 * Only adds activities that don't exist yet, so it is safe to run again and
 * never overwrites edits an admin has made. Retired activities are switched
 * off, not deleted, so events already posted under them keep working.
 *
 * Usage:
 *   pnpm --filter @community/admin-dashboard seed:activities --dry-run
 *   pnpm --filter @community/admin-dashboard seed:activities
 *
 * Requirements (not needed for --dry-run):
 *   - Service account key JSON file
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set to its path
 */

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { DEFAULT_ACTIVITIES, RETIRED_ACTIVITY_IDS } from '@community/types';
import { COLLECTIONS } from '@community/firebase';

const dryRun = process.argv.includes('--dry-run');

const main = async () => {
  if (dryRun) {
    console.log(`Dry run: ${DEFAULT_ACTIVITIES.length} activities would be checked\n`);
    for (const activity of DEFAULT_ACTIVITIES) {
      console.log(`  ${activity.id.padEnd(30)} ${activity.label.padEnd(30)} ${activity.color}`);
    }
    console.log(`\nWould switch off if present: ${RETIRED_ACTIVITY_IDS.join(', ')}`);
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

  const collection = admin.firestore().collection(COLLECTIONS.ACTIVITIES);
  let added = 0;

  for (const activity of DEFAULT_ACTIVITIES) {
    const ref = collection.doc(activity.id);
    const existing = await ref.get();

    if (existing.exists) {
      console.log(`  skipped  ${activity.label} (already exists)`);
      continue;
    }

    await ref.set({
      ...activity,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  added    ${activity.label}`);
    added += 1;
  }

  let retired = 0;
  for (const id of RETIRED_ACTIVITY_IDS) {
    const ref = collection.doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.active === false) {
      continue;
    }

    await ref.update({
      active: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  retired  ${existing.data()?.label ?? id}`);
    retired += 1;
  }

  console.log(
    `\n🎉 Done. Added ${added}, skipped ${DEFAULT_ACTIVITIES.length - added}, switched off ${retired}.`
  );
};

main().catch((error) => {
  console.error('❌ Error seeding activities:', error.message);
  process.exit(1);
});
