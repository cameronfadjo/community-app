import { Venue, VenueFilters, VenueSortOptions } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  updateDocument,
  queryDocuments,
  where,
  orderBy,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { queryVenuesNearby } from '../firebase/geolocation';
import { GeoPoint } from 'firebase/firestore';

/**
 * Create a new venue
 */
export const createVenue = async (venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount' | 'moderationStatus'>): Promise<string> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to create a venue');
  }

  // Generate a unique ID for the venue
  const venueId = `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const venue: Omit<Venue, 'createdAt' | 'updatedAt'> = {
    ...venueData,
    id: venueId,
    rating: 0,
    reviewCount: 0,
    moderationStatus: 'pending',
    submittedBy: currentUser.uid,
  };

  await createDocument(COLLECTIONS.VENUES, venueId, venue);
  return venueId;
};

/**
 * Get a venue by ID
 */
export const getVenue = async (venueId: string): Promise<Venue | null> => {
  return await readDocument<Venue>(COLLECTIONS.VENUES, venueId);
};

/**
 * Update a venue
 */
export const updateVenue = async (
  venueId: string,
  updates: Partial<Venue>
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const venue = await getVenue(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  if (venue.submittedBy !== currentUser.uid) {
    throw new Error('You can only update venues you submitted');
  }

  // Don't allow updating sensitive fields
  const {
    id,
    rating,
    reviewCount,
    moderationStatus,
    submittedBy,
    createdAt,
    ...allowedUpdates
  } = updates;

  await updateDocument(COLLECTIONS.VENUES, venueId, allowedUpdates);
};

/**
 * Get venues near a location
 */
export const getVenuesNearby = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  filters?: VenueFilters
): Promise<Venue[]> => {
  let venues = await queryVenuesNearby(latitude, longitude, radiusKm);

  // Apply filters
  if (filters) {
    venues = applyVenueFilters(venues, filters);
  }

  return venues;
};

/**
 * Apply filters to venue list
 */
const applyVenueFilters = (venues: Venue[], filters: VenueFilters): Venue[] => {
  let filtered = venues;

  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter((venue) => filters.categories!.includes(venue.category));
  }

  if (filters.priceRanges && filters.priceRanges.length > 0) {
    filtered = filtered.filter((venue) => filters.priceRanges!.includes(venue.priceRange));
  }

  if (filters.minRating) {
    filtered = filtered.filter((venue) => venue.rating >= filters.minRating!);
  }

  if (filters.featuredOnly) {
    filtered = filtered.filter((venue) => venue.featured);
  }

  return filtered;
};

/**
 * Sort venues
 */
export const sortVenues = (venues: Venue[], sortOptions: VenueSortOptions): Venue[] => {
  const sorted = [...venues];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortOptions.sortBy) {
      case 'distance':
        // Assuming distance is added to venue objects during nearby query
        comparison = (a as any).distance - (b as any).distance;
        break;
      case 'rating':
        comparison = b.rating - a.rating;
        break;
      case 'price':
        comparison = a.priceRange - b.priceRange;
        break;
      case 'newest':
        // Assuming createdAt is a Timestamp
        comparison =
          (b.createdAt as any).toMillis() - (a.createdAt as any).toMillis();
        break;
    }

    return sortOptions.order === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Search venues by name or description
 */
export const searchVenues = async (searchTerm: string): Promise<Venue[]> => {
  // Note: Firestore doesn't support full-text search natively
  // For production, consider using Algolia or similar service
  const venues = await queryDocuments<Venue>(COLLECTIONS.VENUES, [
    where('moderationStatus', '==', 'approved'),
  ]);

  const searchLower = searchTerm.toLowerCase();

  return venues.filter(
    (venue) =>
      venue.name.toLowerCase().includes(searchLower) ||
      venue.description.toLowerCase().includes(searchLower) ||
      venue.location.city.toLowerCase().includes(searchLower)
  );
};

/**
 * Get featured venues
 */
export const getFeaturedVenues = async (): Promise<Venue[]> => {
  return await queryDocuments<Venue>(COLLECTIONS.VENUES, [
    where('moderationStatus', '==', 'approved'),
    where('featured', '==', true),
    orderBy('rating', 'desc'),
  ]);
};

/**
 * Get user's submitted venues
 */
export const getUserVenues = async (userId: string): Promise<Venue[]> => {
  return await queryDocuments<Venue>(COLLECTIONS.VENUES, [
    where('submittedBy', '==', userId),
    orderBy('createdAt', 'desc'),
  ]);
};
