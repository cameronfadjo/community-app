import { User } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  updateDocument,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { Timestamp } from 'firebase/firestore';

export interface ProfileDetails {
  displayName?: string;
  /** Set at sign-up, once the person has confirmed they are 18 or older */
  confirmedAdultAt?: Timestamp;
}

/**
 * Create the signed-in person's profile. The app does this itself at
 * sign-up; the security rules make sure people can only create their own.
 */
export const createUserProfile = async (details: ProfileDetails = {}): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  await createDocument(COLLECTIONS.USERS, currentUser.uid, {
    uid: currentUser.uid,
    email: currentUser.email || '',
    displayName: details.displayName || currentUser.displayName || 'Anonymous',
    moderationStatus: 'approved',
    ...(details.confirmedAdultAt ? { confirmedAdultAt: details.confirmedAdultAt } : {}),
  });
};

// Sign-up and the sign-in listener can both ask at once. Taking turns stops
// one from creating the profile over the other.
let profileQueue: Promise<unknown> = Promise.resolve();

/**
 * Returns the signed-in person's profile, creating it if this is their
 * first time, and filling in any details it is missing.
 */
export const ensureUserProfile = (details: ProfileDetails = {}): Promise<User | null> => {
  const run = async (): Promise<User | null> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const existing = await getUserProfile(currentUser.uid);
    if (!existing) {
      await createUserProfile(details);
      return await getUserProfile(currentUser.uid);
    }

    const missing: Partial<User> = {};
    if (details.displayName && existing.displayName !== details.displayName) {
      missing.displayName = details.displayName;
    }
    if (details.confirmedAdultAt && !existing.confirmedAdultAt) {
      missing.confirmedAdultAt = details.confirmedAdultAt;
    }
    if (Object.keys(missing).length === 0) {
      return existing;
    }

    await updateDocument(COLLECTIONS.USERS, currentUser.uid, missing);
    return { ...existing, ...missing };
  };

  const result = profileQueue.then(run, run);
  profileQueue = result.catch(() => undefined);
  return result;
};

/**
 * Get a user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  return await readDocument<User>(COLLECTIONS.USERS, userId);
};

/**
 * Get the current user's profile
 */
export const getCurrentUserProfile = async (): Promise<User | null> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return null;
  }
  return await getUserProfile(currentUser.uid);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  // Don't allow updating sensitive fields
  const { uid, email, moderationStatus, createdAt, ...allowedUpdates } = updates;

  await updateDocument(COLLECTIONS.USERS, userId, allowedUpdates);
};
