import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Cloud Function: Triggered when a review is updated
 * - Re-calculates venue rating if rating changed
 * - Re-moderates content if text changed
 */
export const onReviewUpdate = functions.firestore
  .document('reviews/{reviewId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const reviewId = context.params.reviewId;

    try {
      let needsRatingUpdate = false;

      // Check if rating changed
      if (beforeData.rating !== afterData.rating) {
        needsRatingUpdate = true;
      }

      // Check if moderation status changed to approved/rejected
      if (
        beforeData.moderationStatus !== afterData.moderationStatus &&
        (afterData.moderationStatus === 'approved' ||
          afterData.moderationStatus === 'rejected')
      ) {
        needsRatingUpdate = true;
      }

      // Update venue rating stats if needed
      if (needsRatingUpdate) {
        await updateVenueRatingStats(afterData.venueId);
      }

      // Re-moderate if review text changed
      if (beforeData.text !== afterData.text) {
        const moderationResult = await moderateReviewContent(afterData);
        if (!moderationResult.approved) {
          await change.after.ref.update({
            moderationStatus: 'pending',
            moderationFlags: moderationResult.flags,
          });
        }
      }

      // Update timestamp
      await change.after.ref.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Successfully processed review update ${reviewId}`);
    } catch (error) {
      console.error(`Error processing review update ${reviewId}:`, error);
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
 * Basic content moderation
 */
interface ModerationResult {
  approved: boolean;
  flags: string[];
}

async function moderateReviewContent(review: any): Promise<ModerationResult> {
  const flags: string[] = [];
  let approved = true;

  const bannedWords = ['spam', 'scam', 'fake'];
  const reviewText = review.text.toLowerCase();

  for (const word of bannedWords) {
    if (reviewText.includes(word)) {
      flags.push(`Contains banned word: ${word}`);
      approved = false;
    }
  }

  const capsPercentage =
    (review.text.replace(/[^A-Z]/g, '').length / review.text.length) * 100;
  if (capsPercentage > 70) {
    flags.push('Excessive use of capital letters');
    approved = false;
  }

  if (review.rating <= 2 && review.text.length < 20) {
    flags.push('Suspiciously short negative review');
    approved = false;
  }

  return { approved, flags };
}
