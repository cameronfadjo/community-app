import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

/**
 * Initialize Firebase and return the core service instances.
 *
 * Each app reads its own env vars (Expo's `EXPO_PUBLIC_*` or Next.js's
 * `NEXT_PUBLIC_*`) and passes the resulting config here. The factory is
 * idempotent — if a Firebase app is already initialized, it reuses it
 * (important for Next.js HMR and React Native fast refresh).
 *
 * @example
 * ```ts
 * // apps/admin-dashboard/lib/firebase/config.ts
 * import { createFirebaseClient } from '@community/firebase';
 *
 * const { auth, db } = createFirebaseClient({
 *   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
 *   // ...
 * });
 * export { auth, db };
 * ```
 */
export function createFirebaseClient(config: FirebaseOptions): FirebaseClient {
  const existing = getApps();
  const app = existing.length === 0 ? initializeApp(config) : existing[0]!;

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}
