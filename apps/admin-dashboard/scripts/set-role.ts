/**
 * Script to grant or remove a role for an existing account
 *
 * The account must already exist in Firebase Authentication. This sets the
 * custom claim `role`, which the dashboards and the security rules check.
 * It does not create accounts or touch passwords.
 *
 * Usage:
 *   pnpm --filter @community/admin-dashboard set-admin set <email>
 *   pnpm --filter @community/admin-dashboard set-admin remove <email>
 *   pnpm --filter @community/admin-dashboard set-admin list
 *
 *   pnpm --filter @community/admin-dashboard set-partner set <email>
 *   pnpm --filter @community/admin-dashboard set-partner remove <email>
 *   pnpm --filter @community/admin-dashboard set-partner list
 *
 * Requirements:
 *   - Service account key JSON file
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set to its path
 *
 * Note: an account holds one role. Granting one replaces the other, so use
 * separate accounts for the admin and partner dashboards.
 */

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const ROLES = ['admin', 'partner'] as const;
type Role = (typeof ROLES)[number];

const [roleInput, command, email] = process.argv.slice(2);

const usage = () => {
  console.log('Usage:');
  console.log('  set-admin set <email>        Grant the admin role');
  console.log('  set-admin remove <email>     Remove the admin role');
  console.log('  set-admin list               List accounts with the admin role');
  console.log('  set-partner set <email>      Grant the partner role');
  console.log('  set-partner remove <email>   Remove the partner role');
  console.log('  set-partner list             List accounts with the partner role');
};

const isRole = (value: string | undefined): value is Role =>
  ROLES.includes(value as Role);

const main = async () => {
  if (
    !isRole(roleInput) ||
    !command ||
    !['set', 'remove', 'list'].includes(command) ||
    (command !== 'list' && !email)
  ) {
    usage();
    process.exit(1);
  }
  const role: Role = roleInput;

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
        if (user.customClaims?.role === role) {
          console.log(`  ${user.email ?? '(no email)'}  ${user.uid}`);
          found += 1;
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    console.log(`\n${found} ${role} account${found === 1 ? '' : 's'}.`);
    return;
  }

  const user = await admin.auth().getUserByEmail(email as string);
  const previousRole = user.customClaims?.role;

  if (command === 'set') {
    await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, role });
    console.log(`✅ ${email} now has the ${role} role.`);
    if (previousRole && previousRole !== role) {
      console.log(`   This replaced their previous role: ${previousRole}.`);
    }
  } else if (previousRole !== role) {
    console.log(`${email} does not have the ${role} role. Nothing was changed.`);
    return;
  } else {
    const claims = { ...user.customClaims };
    delete claims.role;
    await admin.auth().setCustomUserClaims(user.uid, claims);
    console.log(`✅ The ${role} role was removed from ${email}.`);
  }

  console.log('\nThey must sign out and sign back in for the change to take effect.');
};

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
