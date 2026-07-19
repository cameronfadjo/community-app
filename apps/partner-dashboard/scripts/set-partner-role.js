/**
 * Script to set partner role for a user
 *
 * This script sets the custom claim 'role: partner' for a user
 * allowing them to access the Partner Dashboard.
 *
 * Usage:
 *   node scripts/set-partner-role.js <email>
 *
 * Example:
 *   node scripts/set-partner-role.js admin@example.com
 *
 * Requirements:
 *   - Firebase Admin SDK initialized
 *   - Service account key JSON file
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Check if service account path is provided
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    console.log('\nPlease set it to the path of your service account JSON file:');
    console.log('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"\n');
    process.exit(1);
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized\n');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

/**
 * Set partner role for a user by email
 */
async function setPartnerRole(email) {
  try {
    console.log(`🔍 Looking up user with email: ${email}...`);

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${user.uid}`);

    // Set custom claim
    console.log('🔐 Setting partner role...');
    await admin.auth().setCustomUserClaims(user.uid, { role: 'partner' });

    console.log(`✅ Successfully set partner role for ${email}`);
    console.log(`   User UID: ${user.uid}`);
    console.log('\n⚠️  Note: The user must sign out and sign back in for the role to take effect.\n');

    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Custom claims:', updatedUser.customClaims);

  } catch (error) {
    console.error('❌ Error setting partner role:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('\nUser not found. Please check:');
      console.log('1. The email address is correct');
      console.log('2. The user has already registered in your app\n');
    }

    process.exit(1);
  }
}

/**
 * List all users with partner role
 */
async function listPartners() {
  try {
    console.log('📋 Listing all users with partner role...\n');

    const listUsersResult = await admin.auth().listUsers();
    const partners = listUsersResult.users.filter(
      user => user.customClaims && user.customClaims.role === 'partner'
    );

    if (partners.length === 0) {
      console.log('No users with partner role found.\n');
      return;
    }

    console.log(`Found ${partners.length} partner(s):\n`);
    partners.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing partners:', error.message);
    process.exit(1);
  }
}

/**
 * Remove partner role from a user
 */
async function removePartnerRole(email) {
  try {
    console.log(`🔍 Looking up user with email: ${email}...`);

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${user.uid}`);

    // Remove custom claim by setting it to null
    console.log('🔓 Removing partner role...');
    await admin.auth().setCustomUserClaims(user.uid, { role: null });

    console.log(`✅ Successfully removed partner role from ${email}\n`);

  } catch (error) {
    console.error('❌ Error removing partner role:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Partner Role Management Script\n');
  console.log('Usage:');
  console.log('  node scripts/set-partner-role.js set <email>     - Set partner role for user');
  console.log('  node scripts/set-partner-role.js remove <email>  - Remove partner role from user');
  console.log('  node scripts/set-partner-role.js list            - List all partners\n');
  console.log('Examples:');
  console.log('  node scripts/set-partner-role.js set admin@example.com');
  console.log('  node scripts/set-partner-role.js remove admin@example.com');
  console.log('  node scripts/set-partner-role.js list\n');
  process.exit(0);
}

// Execute command
(async () => {
  try {
    if (command === 'set') {
      const email = args[1];
      if (!email) {
        console.error('❌ Error: Email address required');
        console.log('Usage: node scripts/set-partner-role.js set <email>\n');
        process.exit(1);
      }
      await setPartnerRole(email);
    } else if (command === 'remove') {
      const email = args[1];
      if (!email) {
        console.error('❌ Error: Email address required');
        console.log('Usage: node scripts/set-partner-role.js remove <email>\n');
        process.exit(1);
      }
      await removePartnerRole(email);
    } else if (command === 'list') {
      await listPartners();
    } else {
      console.error(`❌ Error: Unknown command '${command}'`);
      console.log('\nValid commands: set, remove, list\n');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
})();
