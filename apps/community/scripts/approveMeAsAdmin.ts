/**
 * TEMPORARY SCRIPT: Approve yourself as the first admin
 *
 * This script directly updates Firestore to approve your account.
 * After you're approved, you can use the admin dashboard.
 *
 * NOTE: This does NOT set custom claims (role: 'admin').
 * For now, it just approves your user account so you can access the consumer app.
 * Setting custom claims requires Firebase Admin SDK with service account credentials.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function approveMe() {
  try {
    // Your user ID from the error messages
    const myUserId = 'WPj34qoXNEPvkvjfsTcqoJnHmzo1';

    console.log(`\n🔄 Approving your consumer account: ${myUserId}...`);
    console.log(`   This will let you access the Community app.\n`);

    await updateDoc(doc(db, 'users', myUserId), {
      moderationStatus: 'approved',
      verified: true,
    });

    console.log('✅ Success! Your consumer account has been approved.');
    console.log('\n📱 You can now:');
    console.log('   1. Refresh the Community app (localhost:8081)');
    console.log('   2. Access all consumer features');
    console.log('   3. Browse venues, add favorites, write reviews\n');

    console.log('⚠️  Note: Admin dashboard access requires custom claims');
    console.log('   For admin access, you need to:');
    console.log('   1. Upgrade Firebase to Blaze plan (pay-as-you-go)');
    console.log('   2. Deploy Cloud Functions with admin role setup');
    console.log('   3. Or use Firebase Console to manually set custom claims\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error approving account:', error.message);
    console.log('\n💡 Alternative: Use Firebase Console');
    console.log('   1. Go to: https://console.firebase.google.com/project/community-86792/firestore');
    console.log('   2. Navigate to: users/WPj34qoXNEPvkvjfsTcqoJnHmzo1');
    console.log('   3. Edit the document and change:');
    console.log('      - moderationStatus: "approved"');
    console.log('      - verified: true\n');
    process.exit(1);
  }
}

approveMe();
