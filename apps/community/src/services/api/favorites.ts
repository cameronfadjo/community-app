import { Venue } from '../../types';
import {
  readDocument,
  updateDocument,
  queryDocuments,
  where,
  arrayUnion,
  arrayRemove,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { getVenue } from './venues';

/**
 * Add a venue to user's favorites
 */
export const addFavorite = async (venueId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to add favorites');
  }

  await updateDocument('users', currentUser.uid, {
    favorites: arrayUnion(venueId),
  });
};

/**
 * Remove a venue from user's favorites
 */
export const removeFavorite = async (venueId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to remove favorites');
  }

  await updateDocument('users', currentUser.uid, {
    favorites: arrayRemove(venueId),
  });
};

/**
 * Toggle favorite status for a venue
 */
export const toggleFavorite = async (venueId: string, isFavorite: boolean): Promise<void> => {
  if (isFavorite) {
    await removeFavorite(venueId);
  } else {
    await addFavorite(venueId);
  }
};

/**
 * Check if a venue is in user's favorites
 */
export const isFavorite = async (venueId: string): Promise<boolean> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const userProfile = await readDocument('users', currentUser.uid);
  if (!userProfile) {
    return false;
  }

  return userProfile.favorites?.includes(venueId) || false;
};

/**
 * Get all favorite venue IDs for current user
 */
export const getFavoriteIds = async (): Promise<string[]> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const userProfile = await readDocument('users', currentUser.uid);
  if (!userProfile) {
    return [];
  }

  return userProfile.favorites || [];
};

/**
 * Get all favorite venues for current user
 */
export const getFavoriteVenues = async (): Promise<Venue[]> => {
  const favoriteIds = await getFavoriteIds();

  if (favoriteIds.length === 0) {
    return [];
  }

  // Fetch all favorite venues
  const venues: Venue[] = [];
  for (const venueId of favoriteIds) {
    try {
      const venue = await getVenue(venueId);
      if (venue) {
        venues.push(venue);
      }
    } catch (error) {
      console.error(`Error fetching favorite venue ${venueId}:`, error);
      // Continue with other venues even if one fails
    }
  }

  return venues;
};

/**
 * Get favorite venues count for current user
 */
export const getFavoritesCount = async (): Promise<number> => {
  const favoriteIds = await getFavoriteIds();
  return favoriteIds.length;
};

/**
 * Clear all favorites for current user
 */
export const clearAllFavorites = async (): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  await updateDocument('users', currentUser.uid, {
    favorites: [],
  });
};
