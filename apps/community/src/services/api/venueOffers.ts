import { getVenueOfferCount } from './offers';

/**
 * Get offer counts for multiple venues efficiently
 * Returns a map of venueId -> offer count
 */
export const getOfferCountsForVenues = async (
  venueIds: string[]
): Promise<Map<string, number>> => {
  const offerCounts = new Map<string, number>();

  // Fetch offer counts in parallel
  const promises = venueIds.map(async (venueId) => {
    try {
      const count = await getVenueOfferCount(venueId);
      return { venueId, count };
    } catch (error) {
      console.error(`Error fetching offer count for venue ${venueId}:`, error);
      return { venueId, count: 0 };
    }
  });

  const results = await Promise.all(promises);

  results.forEach(({ venueId, count }) => {
    offerCounts.set(venueId, count);
  });

  return offerCounts;
};
