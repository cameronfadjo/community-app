import { create } from 'zustand';
import { Venue, VenueCategory, PriceRange } from '../types';
import { getVenuesNearby, sortVenues } from '../services/api/venues';
import { SAMPLE_VENUES } from '../data/sampleVenues';

interface VenueState {
  // State
  venues: (Venue & { distance?: number })[];
  filteredVenues: (Venue & { distance?: number })[];
  selectedVenueId: string | null;
  loading: boolean;
  error: string | null;
  userLocation: { latitude: number; longitude: number } | null;

  // Filters
  selectedCategories: VenueCategory[];
  selectedPriceRanges: PriceRange[];
  radiusKm: number;

  // Actions
  setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
  fetchNearbyVenues: (latitude: number, longitude: number) => Promise<void>;
  selectVenue: (venueId: string | null) => void;
  toggleCategory: (category: VenueCategory) => void;
  togglePriceRange: (priceRange: PriceRange) => void;
  clearFilters: () => void;
  setRadius: (radiusKm: number) => void;
  applyFilters: () => void;
  useSampleData: () => void; // For testing without Firebase
}

export const useVenueStore = create<VenueState>((set, get) => ({
  // Initial state
  venues: [],
  filteredVenues: [],
  selectedVenueId: null,
  loading: false,
  error: null,
  userLocation: null,

  // Initial filters
  selectedCategories: [],
  selectedPriceRanges: [],
  radiusKm: 50,

  // Set user location
  setUserLocation: (location) => {
    set({ userLocation: location });
  },

  // Fetch nearby venues
  fetchNearbyVenues: async (latitude: number, longitude: number) => {
    set({ loading: true, error: null });

    try {
      const { radiusKm } = get();
      const venues = await getVenuesNearby(latitude, longitude, radiusKm);

      // Sort by distance by default
      const sortedVenues = sortVenues(venues, { sortBy: 'distance', order: 'asc' });

      set({
        venues: sortedVenues,
        userLocation: { latitude, longitude },
        loading: false,
      });

      // Apply filters
      get().applyFilters();
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      set({
        loading: false,
        error: error.message || 'Failed to fetch venues',
      });
    }
  },

  // Select a venue
  selectVenue: (venueId) => {
    set({ selectedVenueId: venueId });
  },

  // Toggle category filter
  toggleCategory: (category) => {
    const { selectedCategories } = get();
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    set({ selectedCategories: newCategories });
    get().applyFilters();
  },

  // Toggle price range filter
  togglePriceRange: (priceRange) => {
    const { selectedPriceRanges } = get();
    const newPriceRanges = selectedPriceRanges.includes(priceRange)
      ? selectedPriceRanges.filter((p) => p !== priceRange)
      : [...selectedPriceRanges, priceRange];

    set({ selectedPriceRanges: newPriceRanges });
    get().applyFilters();
  },

  // Clear all filters
  clearFilters: () => {
    set({
      selectedCategories: [],
      selectedPriceRanges: [],
    });
    get().applyFilters();
  },

  // Set search radius
  setRadius: (radiusKm) => {
    set({ radiusKm });
  },

  // Apply filters to venues
  applyFilters: () => {
    const { venues, selectedCategories, selectedPriceRanges } = get();

    let filtered = [...venues];

    // Filter by category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((venue) =>
        selectedCategories.includes(venue.category)
      );
    }

    // Filter by price range
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter((venue) =>
        selectedPriceRanges.includes(venue.priceRange)
      );
    }

    set({ filteredVenues: filtered });
  },

  // Load sample data (for testing)
  useSampleData: () => {
    const venues = SAMPLE_VENUES as any[]; // Sample data doesn't have Timestamps
    set({
      venues,
      loading: false,
      error: null,
    });
    get().applyFilters();
  },
}));
