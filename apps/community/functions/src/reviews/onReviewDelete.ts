import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function: Triggered when a review is deleted
 * - Updates venue rating statistics
 * - Cleans up associated images from Storage
 */
export const onReviewDelete = functions.firestore
  .document('reviews/{reviewId}')
  .onDelete(async (snapshot, context) => {
    const review = snapshot.data();
    const reviewId = context.params.reviewId;

    try {
      // Update venue rating stats
      await updateVenueRatingStats(review.venueId);

      // Delete associated images from Firebase Storage
      if (review.images && review.images.length > 0) {
        await deleteReviewImages(reviewId, review.images);
      }

      console.log(`Successfully processed review deletion ${reviewId}`);
    } catch (error) {
      console.error(`Error processing review deletion ${reviewId}:`, error);
      throw error;
    }
  });

/**
 * Update venue's average rating and review count
 */
async function updateVenueRatingStats(venueId: string): Promise<void> {
  const reviewsSnapshot = await admin
    .firestore()
    .collection('reviews')
    .where('venueId', '==', venueId)
    .where('moderationStatus', '==', 'approved')
    .get();

  let totalRating = 0;
  let reviewCount = 0;

  reviewsSnapshot.forEach((doc) => {
    const review = doc.data();
    totalRating += review.rating;
    reviewCount++;
  });

  const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

  await admin
    .firestore()
    .collection('venues')
    .doc(venueId)
    .update({
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviewCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Delete review images from Firebase Storage
 */
async function deleteReviewImages(reviewId: string, imageUrls: string[]): Promise<void> {
  const bucket = admin.storage().bucket();

  for (const imageUrl of imageUrls) {
    try {
      // Extract file path from URL
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
      const urlParts = imageUrl.split('/o/');
      if (urlParts.length < 2) continue;

      const pathWithQuery = urlParts[1];
      const filePath = decodeURIComponent(pathWithQuery.split('?')[0]);

      // Delete the file
      await bucket.file(filePath).delete();
      console.log(`Deleted image: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting image ${imageUrl}:`, error);
      // Continue with other images even if one fails
    }
  }
}
