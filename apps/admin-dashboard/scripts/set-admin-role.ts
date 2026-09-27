/**
 * Script to grant or remove the admin role for an existing account
 *
 * The account must already exist in Firebase Authentication. This sets the
 * custom claim `role: 'admin'`, which the admin dashboard and the security
 * rules check. It does not create accounts or touch passwords.
 *
 * Usage:
 *   pnpm --filter @community/admin-dashboard set-admin set <email>
 *   pnpm --filter @community/admin-dashboard set-admin remove <email>
 *   pnpm --filter @community/admin-dashboard set-admin list
 *
 * Requirements:
 *   - Service account key JSON file
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set to its path
 *
 * Note: an account holds one role. Granting admin replaces the partner role.
 */

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const [command, email] = process.argv.slice(2);

const usage = () => {
  console.log('Usage:');
  console.log('  set-admin set <email>      Grant the admin role');
  console.log('  set-admin remove <email>   Remove the admin role');
  console.log('  set-admin list             List accounts with the admin role');
};

const main = async () => {
  if (!command || !['set', 'remove', 'list'].includes(command) || (command !== 'list' && !email)) {
    usage();
    process.exit(1);
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

  if (command === 'list') {
    let pageToken: string | undefined;
    let found = 0;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      for (const user of page.users) {
        if (user.customClaims?.role === 'admin') {
          console.log(`  ${user.email ?? '(no email)'}  ${user.uid}`);
          found += 1;
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    console.log(`\n${found} admin account${found === 1 ? '' : 's'}.`);
    return;
  }

  const user = await admin.auth().getUserByEmail(email as string);
  const previousRole = user.customClaims?.role;

  if (command === 'set') {
    await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, role: 'admin' });
    console.log(`✅ ${email} is now an admin.`);
    if (previousRole && previousRole !== 'admin') {
      console.log(`   This replaced their previous role: ${previousRole}.`);
    }
  } else {
    const { role: _removed, ...rest } = user.customClaims ?? {};
    await admin.auth().setCustomUserClaims(user.uid, rest);
    console.log(`✅ Admin role removed from ${email}.`);
  }

  console.log('\nThey must sign out and sign back in for the change to take effect.');
};

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
