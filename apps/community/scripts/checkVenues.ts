import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function checkVenues() {
  console.log('Checking venues in Firestore...\n');

  try {
    const venuesSnapshot = await getDocs(collection(db, 'venues'));
    
    if (venuesSnapshot.empty) {
      console.log('❌ No venues found in Firestore!');
    } else {
      console.log(`✅ Found ${venuesSnapshot.size} venues:\n`);
      venuesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${doc.id}: ${data.name} (${data.moderationStatus})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking venues:', error);
    process.exit(1);
  }
}

checkVenues();
