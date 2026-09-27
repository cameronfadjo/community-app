import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Cloud Function triggered when a review is created, updated, or deleted
 * Updates the venue's average rating and review count
 */
export const updateVenueRating = functions.firestore
  .document('reviews/{reviewId}')
  .onWrite(async (change, context) => {
    const reviewId = context.params.reviewId;

    try {
      // Get the review data
      const reviewData = change.after.exists ? change.after.data() : null;
      const oldReviewData = change.before.exists ? change.before.data() : null;

      // Determine the venue ID
      const venueId = reviewData?.venueId || oldReviewData?.venueId;

      if (!venueId) {
        functions.logger.warn(`No venue ID found for review ${reviewId}`);
        return null;
      }

      // Get all reviews for this venue
      const reviewsSnapshot = await admin
        .firestore()
        .collection('reviews')
        .where('venueId', '==', venueId)
        .get();

      // Calculate new average rating and count
      let totalRating = 0;
      let reviewCount = 0;

      reviewsSnapshot.forEach((doc) => {
        const review = doc.data();
        totalRating += review.rating;
        reviewCount++;
      });

      const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

      // Update venue document
      await admin
        .firestore()
        .collection('venues')
        .doc(venueId)
        .update({
          rating: averageRating,
          reviewCount: reviewCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      functions.logger.info(
        `Updated venue ${venueId}: rating=${averageRating}, count=${reviewCount}`
      );

      return { success: true };
    } catch (error) {
      functions.logger.error('Error updating venue rating:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update venue rating');
    }
  });
