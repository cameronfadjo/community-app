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

async function approveMyAccount() {
  try {
    // Your user ID from the error message
    const myUserId = 'WPj34qoXNEPvkvjfsTcqoJnHmzo1';

    console.log(`Approving user account: ${myUserId}...`);

    await updateDoc(doc(db, 'users', myUserId), {
      moderationStatus: 'approved',
      verified: true, // Also verify you as super admin
    });

    console.log('✅ Success! Your account has been approved.');
    console.log('You can now refresh the app and access all features.');

    process.exit(0);
  } catch (error) {
    console.error('Error approving account:', error);
    process.exit(1);
  }
}

approveMyAccount();
