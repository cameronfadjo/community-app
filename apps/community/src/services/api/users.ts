import { User } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  updateDocument,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { Timestamp } from 'firebase/firestore';

/**
 * Create a new user profile in Firestore
 * This is typically called after Firebase Auth user creation
 */
export const createUserProfile = async (userData: Partial<User>): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  const userProfile: Omit<User, 'createdAt' | 'updatedAt'> = {
    uid: currentUser.uid,
    email: currentUser.email || '',
    displayName: userData.displayName || currentUser.displayName || 'Anonymous',
    moderationStatus: 'approved',
  };

  await createDocument(COLLECTIONS.USERS, currentUser.uid, userProfile);
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
