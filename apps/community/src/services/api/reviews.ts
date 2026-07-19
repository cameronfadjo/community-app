import { Review, ReviewFormData } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  where,
  orderBy,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { getUserProfile } from './users';

/**
 * Create a new review
 */
export const createReview = async (
  venueId: string,
  reviewData: ReviewFormData
): Promise<string> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to create a review');
  }

  // Get user profile for denormalized data
  const userProfile = await getUserProfile(currentUser.uid);
  if (!userProfile) {
    throw new Error('User profile not found');
  }

  // Generate a unique ID for the review
  const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const review: Omit<Review, 'createdAt' | 'updatedAt'> = {
    id: reviewId,
    venueId,
    userId: currentUser.uid,
    userName: userProfile.displayName,
    userPhotoURL: userProfile.photoURL,
    rating: reviewData.rating,
    text: reviewData.text,
    images: reviewData.images,
    helpful: 0,
    helpfulBy: [],
  };

  await createDocument(COLLECTIONS.REVIEWS, reviewId, review);
  return reviewId;
};

/**
 * Get a review by ID
 */
export const getReview = async (reviewId: string): Promise<Review | null> => {
  return await readDocument<Review>(COLLECTIONS.REVIEWS, reviewId);
};

/**
 * Update a review
 */
export const updateReview = async (
  reviewId: string,
  updates: Partial<ReviewFormData>
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const review = await getReview(reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  if (review.userId !== currentUser.uid) {
    throw new Error('You can only update your own reviews');
  }

  await updateDocument(COLLECTIONS.REVIEWS, reviewId, updates);
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const review = await getReview(reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  if (review.userId !== currentUser.uid) {
    throw new Error('You can only delete your own reviews');
  }

  await deleteDocument(COLLECTIONS.REVIEWS, reviewId);
};

/**
 * Get reviews for a venue
 */
export const getVenueReviews = async (
  venueId: string,
  sortBy: 'recent' | 'helpful' = 'recent'
): Promise<Review[]> => {
  const orderField = sortBy === 'recent' ? 'createdAt' : 'helpful';

  return await queryDocuments<Review>(COLLECTIONS.REVIEWS, [
    where('venueId', '==', venueId),
    orderBy(orderField, 'desc'),
  ]);
};

/**
 * Get reviews by a user
 */
export const getUserReviews = async (userId: string): Promise<Review[]> => {
  return await queryDocuments<Review>(COLLECTIONS.REVIEWS, [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  ]);
};

/**
 * Mark a review as helpful
 */
export const markReviewHelpful = async (
  reviewId: string,
  userId: string,
  isHelpful: boolean
): Promise<void> => {
  const review = await getReview(reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  const helpfulBy = review.helpfulBy || [];

  if (isHelpful) {
    // Add to helpful
    if (!helpfulBy.includes(userId)) {
      helpfulBy.push(userId);
      await updateDocument(COLLECTIONS.REVIEWS, reviewId, {
        helpful: review.helpful + 1,
        helpfulBy,
      });
    }
  } else {
    // Remove from helpful
    if (helpfulBy.includes(userId)) {
      const updatedHelpfulBy = helpfulBy.filter((uid) => uid !== userId);
      await updateDocument(COLLECTIONS.REVIEWS, reviewId, {
        helpful: Math.max(0, review.helpful - 1),
        helpfulBy: updatedHelpfulBy,
      });
    }
  }
};

/**
 * Check if current user marked a review as helpful
 */
export const isReviewHelpful = async (reviewId: string): Promise<boolean> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const review = await getReview(reviewId);
  if (!review) {
    return false;
  }

  return review.helpfulBy?.includes(currentUser.uid) || false;
};

/**
 * Get average rating for a venue
 * This is typically calculated by Cloud Functions, but can be used as fallback
 */
export const calculateAverageRating = async (venueId: string): Promise<number> => {
  const reviews = await getVenueReviews(venueId);

  if (reviews.length === 0) {
    return 0;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return totalRating / reviews.length;
};
