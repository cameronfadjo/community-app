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
    bio: userData.bio || '',
    verified: false,
    moderationStatus: 'pending',
    subscriptionTier: 'free',
    favorites: [],
  };

  // Only add optional fields if they have values
  if (userData.photoURL || currentUser.photoURL) {
    userProfile.photoURL = userData.photoURL || currentUser.photoURL || undefined;
  }
  if (userData.location) {
    userProfile.location = userData.location;
  }

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
  const { uid, email, moderationStatus, verified, createdAt, ...allowedUpdates } = updates;

  await updateDocument(COLLECTIONS.USERS, userId, allowedUpdates);
};

/**
 * Add a venue to user's favorites
 */
export const addToFavorites = async (userId: string, venueId: string): Promise<void> => {
  const user = await getUserProfile(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const favorites = user.favorites || [];
  if (!favorites.includes(venueId)) {
    favorites.push(venueId);
    await updateDocument(COLLECTIONS.USERS, userId, { favorites });
  }
};

/**
 * Remove a venue from user's favorites
 */
export const removeFromFavorites = async (userId: string, venueId: string): Promise<void> => {
  const user = await getUserProfile(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const favorites = user.favorites || [];
  const updatedFavorites = favorites.filter((id) => id !== venueId);

  await updateDocument(COLLECTIONS.USERS, userId, { favorites: updatedFavorites });
};

/**
 * Check if a venue is in user's favorites
 */
export const isInFavorites = async (userId: string, venueId: string): Promise<boolean> => {
  const user = await getUserProfile(userId);
  if (!user) {
    return false;
  }

  return user.favorites?.includes(venueId) || false;
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (userId: string, venueId: string): Promise<boolean> => {
  const isFavorite = await isInFavorites(userId, venueId);

  if (isFavorite) {
    await removeFromFavorites(userId, venueId);
    return false;
  } else {
    await addToFavorites(userId, venueId);
    return true;
  }
};
