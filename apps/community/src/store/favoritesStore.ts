import { create } from 'zustand';
import { Venue } from '../types';
import {
  getFavoriteVenues,
  getFavoriteIds,
  addFavorite,
  removeFavorite,
  clearAllFavorites,
} from '../services/api/favorites';

interface FavoritesState {
  // State
  favoriteVenues: Venue[];
  favoriteIds: Set<string>;
  loading: boolean;
  error: string | null;

  // Actions
  loadFavorites: () => Promise<void>;
  toggleFavorite: (venueId: string, venue?: Venue) => Promise<void>;
  isFavorite: (venueId: string) => boolean;
  clearFavorites: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  // Initial State
  favoriteVenues: [],
  favoriteIds: new Set<string>(),
  loading: false,
  error: null,

  // Load all favorites
  loadFavorites: async () => {
    set({ loading: true, error: null });

    try {
      const [venues, ids] = await Promise.all([
        getFavoriteVenues(),
        getFavoriteIds(),
      ]);

      set({
        favoriteVenues: venues,
        favoriteIds: new Set(ids),
        loading: false,
      });
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      set({
        error: error.message || 'Failed to load favorites',
        loading: false,
      });
    }
  },

  // Toggle favorite status for a venue
  toggleFavorite: async (venueId: string, venue?: Venue) => {
    const { favoriteIds, favoriteVenues } = get();
    const isFavorited = favoriteIds.has(venueId);

    // Optimistic update
    const newFavoriteIds = new Set(favoriteIds);
    let newFavoriteVenues = [...favoriteVenues];

    if (isFavorited) {
      // Remove from favorites
      newFavoriteIds.delete(venueId);
      newFavoriteVenues = newFavoriteVenues.filter(v => v.id !== venueId);
    } else {
      // Add to favorites
      newFavoriteIds.add(venueId);
      if (venue) {
        newFavoriteVenues.push(venue);
      }
    }

    set({
      favoriteIds: newFavoriteIds,
      favoriteVenues: newFavoriteVenues,
    });

    try {
      if (isFavorited) {
        await removeFavorite(venueId);
      } else {
        await addFavorite(venueId);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      set({
        favoriteIds,
        favoriteVenues,
      });
      throw error;
    }
  },

  // Check if a venue is favorited
  isFavorite: (venueId: string) => {
    return get().favoriteIds.has(venueId);
  },

  // Clear all favorites
  clearFavorites: async () => {
    const previousState = {
      favoriteVenues: get().favoriteVenues,
      favoriteIds: get().favoriteIds,
    };

    // Optimistic update
    set({
      favoriteVenues: [],
      favoriteIds: new Set<string>(),
    });

    try {
      await clearAllFavorites();
    } catch (error: any) {
      console.error('Error clearing favorites:', error);
      // Revert on error
      set(previousState);
      throw error;
    }
  },

  // Refresh favorites from server
  refreshFavorites: async () => {
    await get().loadFavorites();
  },
}));
