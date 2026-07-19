/**
 * Shared constants for the Partner Dashboard
 */

// Price range labels
export const PRICE_RANGES = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
} as const;

export type PriceRange = keyof typeof PRICE_RANGES;

// Venue categories with display info
export const VENUE_CATEGORIES = {
  resort: { icon: '🏨', label: 'Resort' },
  club: { icon: '🎉', label: 'Club' },
  restaurant: { icon: '🍽️', label: 'Restaurant' },
  bar: { icon: '🍸', label: 'Bar' },
  event: { icon: '🎭', label: 'Event' },
  attraction: { icon: '🎡', label: 'Attraction' },
} as const;

export type VenueCategory = keyof typeof VENUE_CATEGORIES;

// Rating display
export const RATING_PRECISION = 1; // Decimal places for rating display
export const MAX_RATING = 5;
export const MIN_RATING = 1;

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Analytics time windows
export const ANALYTICS_WINDOWS = {
  RECENT_ACTIVITY_DAYS: 7,
  TOP_VENUES_LIMIT: 10,
} as const;

// Moderation statuses
export const MODERATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Status badge colors
export const STATUS_BADGE_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
} as const;

// Review rating filters
export const REVIEW_RATING_FILTERS = [5, 4, 3, 2, 1] as const;

// Helper functions
export function getCategoryIcon(category: VenueCategory): string {
  return VENUE_CATEGORIES[category]?.icon || '📍';
}

export function getCategoryLabel(category: VenueCategory): string {
  return VENUE_CATEGORIES[category]?.label || category;
}

export function getPriceRangeLabel(priceRange: PriceRange): string {
  return PRICE_RANGES[priceRange] || '';
}

export function formatRating(rating: number): string {
  return rating.toFixed(RATING_PRECISION);
}
