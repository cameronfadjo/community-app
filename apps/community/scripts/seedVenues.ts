/**
 * Script to seed sample venue data into Firestore
 * Run with: npm run seed:venues
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Firebase config
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

const sampleVenues = [
  // NYC Venues
  {
    id: 'venue_stonewall_inn',
    name: 'Stonewall Inn',
    description: 'Historic LGBTQ+ landmark and bar in Greenwich Village. Site of the 1969 Stonewall riots that sparked the modern gay rights movement.',
    category: 'bar',
    location: {
      address: '53 Christopher St, New York, NY 10014',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7339, -74.0027),
    },
    priceRange: 2, // $$
    rating: 4.6,
    reviewCount: 1847,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (212) 488-2705',
      website: 'https://stonewallinnnyc.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_phoenix_nyc',
    name: 'The Phoenix',
    description: 'Neighborhood bar in the East Village with a welcoming atmosphere. Known for its jukebox, pool table, and friendly crowd.',
    category: 'bar',
    location: {
      address: '447 E 13th St, New York, NY 10009',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7287, -73.9817),
    },
    priceRange: 2, // $$
    rating: 4.5,
    reviewCount: 423,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (212) 477-9979',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_julius_bar',
    name: "Julius' Bar",
    description: 'NYC\'s oldest gay bar, established 1864. Cozy West Village tavern with historic significance and a relaxed atmosphere.',
    category: 'bar',
    location: {
      address: '159 W 10th St, New York, NY 10014',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7339, -74.0013),
    },
    priceRange: 2, // $$
    rating: 4.7,
    reviewCount: 312,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (212) 929-9672',
      website: 'https://juliusbarny.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_rebar_brooklyn',
    name: 'Rebar',
    description: 'Brooklyn LGBTQ+ nightclub and performance space in Dumbo. Features DJs, drag shows, and themed nights.',
    category: 'club',
    location: {
      address: '147 Front St, Brooklyn, NY 11201',
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7028, -73.9874),
    },
    priceRange: 3, // $$$
    rating: 4.4,
    reviewCount: 589,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (718) 766-9110',
      website: 'https://rebarnyc.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_cubbyhole',
    name: 'Cubbyhole',
    description: 'Legendary lesbian bar in the West Village. Cozy atmosphere with creative decor and a diverse, welcoming crowd.',
    category: 'bar',
    location: {
      address: '281 W 12th St, New York, NY 10014',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7379, -74.0052),
    },
    priceRange: 2, // $$
    rating: 4.6,
    reviewCount: 756,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (212) 243-9041',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_hardware_bar',
    name: 'Hardware Bar',
    description: 'Intimate craft cocktail bar in Hell\'s Kitchen. Known for creative drinks and a sophisticated atmosphere.',
    category: 'bar',
    location: {
      address: '697 10th Ave, New York, NY 10019',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7644, -73.9903),
    },
    priceRange: 3, // $$$
    rating: 4.5,
    reviewCount: 234,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (212) 500-7625',
      website: 'https://hardwarebarnyc.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_therapy_nyc',
    name: 'Therapy',
    description: 'Spacious Hell\'s Kitchen bar and lounge with drag shows, DJs, and a lively dance floor. Popular brunch spot.',
    category: 'bar',
    location: {
      address: '348 W 52nd St, New York, NY 10019',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7647, -73.9889),
    },
    priceRange: 2, // $$
    rating: 4.3,
    reviewCount: 892,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (212) 397-1700',
      website: 'https://therapy-nyc.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_pieces_bar',
    name: 'Pieces',
    description: 'Fun West Village bar known for its musical theater showtunes, friendly bartenders, and energetic atmosphere.',
    category: 'bar',
    location: {
      address: '8 Christopher St, New York, NY 10014',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7334, -74.0021),
    },
    priceRange: 2, // $$
    rating: 4.4,
    reviewCount: 567,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (212) 929-9291',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_metropolitan_brooklyn',
    name: 'Metropolitan',
    description: 'Williamsburg neighborhood bar with a backyard, DJ nights, and a laid-back vibe. Popular LGBTQ+ hangout.',
    category: 'bar',
    location: {
      address: '559 Lorimer St, Brooklyn, NY 11211',
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.7143, -73.9501),
    },
    priceRange: 2, // $$
    rating: 4.5,
    reviewCount: 445,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (718) 599-4444',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_ginger_brooklyn',
    name: "Ginger's Bar",
    description: 'Park Slope lesbian bar with a friendly neighborhood feel. Features karaoke, trivia nights, and a welcoming crowd.',
    category: 'bar',
    location: {
      address: '363 5th Ave, Brooklyn, NY 11215',
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA',
      coordinates: new GeoPoint(40.6710, -73.9846),
    },
    priceRange: 2, // $$
    rating: 4.6,
    reviewCount: 389,
    featured: true,
    images: [],
    contact: {
      phone: '+1 (718) 788-0924',
      website: 'https://gingersbarbrooklyn.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },

  // San Francisco Venues (keeping for diversity)
  {
    id: 'venue_rainbow_lounge',
    name: 'The Rainbow Lounge',
    description: 'Iconic LGBTQ+ bar in the heart of the city. Known for drag shows, themed nights, and inclusive atmosphere.',
    category: 'bar',
    location: {
      address: '123 Castro St, San Francisco, CA 94114',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      coordinates: new GeoPoint(37.7749, -122.4194),
    },
    priceRange: 2, // $$
    rating: 4.5,
    reviewCount: 234,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (415) 555-0123',
      website: 'https://rainbowlounge.example.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
  {
    id: 'venue_cafe_pride',
    name: 'Cafe Pride',
    description: 'Cozy coffee shop and bookstore celebrating LGBTQ+ authors and artists. Perfect for meetings or quiet reading.',
    category: 'cafe',
    location: {
      address: '456 Market St, San Francisco, CA 94102',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      coordinates: new GeoPoint(37.7858, -122.4064),
    },
    priceRange: 1, // $
    rating: 4.7,
    reviewCount: 156,
    featured: false,
    images: [],
    contact: {
      phone: '+1 (415) 555-0124',
      email: 'hello@cafepride.example.com',
      website: 'https://cafepride.example.com',
    },
    moderationStatus: 'approved',
    submittedBy: 'system',
  },
];

async function seedVenues() {
  console.log('Starting to seed venues...\n');

  try {
    for (const venue of sampleVenues) {
      const { id, ...venueData } = venue;
      await setDoc(doc(db, 'venues', id), {
        ...venueData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Added venue: ${venue.name} (${id})`);
    }

    console.log(`\n🎉 Successfully seeded ${sampleVenues.length} venues!`);
    console.log(`   - ${sampleVenues.filter(v => v.location.city.includes('New York') || v.location.city === 'Brooklyn').length} NYC venues`);
    console.log(`   - ${sampleVenues.filter(v => v.location.city === 'San Francisco').length} San Francisco venues`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding venues:', error);
    process.exit(1);
  }
}

// Run the seed function
seedVenues();
