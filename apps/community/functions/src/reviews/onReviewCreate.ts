import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Cloud Function: Triggered when a new review is created
 * - Updates venue rating statistics
 * - Checks for inappropriate content
 * - Sends notifications
 */
export const onReviewCreate = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async (snapshot, context) => {
    const review = snapshot.data();
    const reviewId = context.params.reviewId;

    try {
      // Update venue rating statistics
      await updateVenueRatingStats(review.venueId);

      // Check for inappropriate content (basic moderation)
      const moderationResult = await moderateReviewContent(review);
      if (!moderationResult.approved) {
        // Flag review for manual moderation
        await snapshot.ref.update({
          moderationStatus: 'pending',
          moderationFlags: moderationResult.flags,
        });
      } else {
        // Auto-approve clean reviews
        await snapshot.ref.update({
          moderationStatus: 'approved',
        });
      }

      // Send notification to venue owner (if they've enabled notifications)
      await sendReviewNotification(review.venueId, reviewId, review);

      console.log(`Successfully processed review ${reviewId}`);
    } catch (error) {
      console.error(`Error processing review ${reviewId}:`, error);
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
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviewCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Basic content moderation
 * In production, you'd want to use a service like Google Cloud Natural Language API
 */
interface ModerationResult {
  approved: boolean;
  flags: string[];
}

async function moderateReviewContent(review: any): Promise<ModerationResult> {
  const flags: string[] = [];
  let approved = true;

  // List of inappropriate words/phrases (simplified example)
  const bannedWords = [
    'spam',
    'scam',
    'fake',
    // Add more as needed
  ];

  const reviewText = review.text.toLowerCase();

  // Check for banned words
  for (const word of bannedWords) {
    if (reviewText.includes(word)) {
      flags.push(`Contains banned word: ${word}`);
      approved = false;
    }
  }

  // Check for excessive caps (potential spam)
  const capsPercentage =
    (review.text.replace(/[^A-Z]/g, '').length / review.text.length) * 100;
  if (capsPercentage > 70) {
    flags.push('Excessive use of capital letters');
    approved = false;
  }

  // Check for very short reviews with low ratings (potential spam)
  if (review.rating <= 2 && review.text.length < 20) {
    flags.push('Suspiciously short negative review');
    approved = false;
  }

  // Check for duplicate content (simplified check)
  const existingReviews = await admin
    .firestore()
    .collection('reviews')
    .where('userId', '==', review.userId)
    .where('text', '==', review.text)
    .get();

  if (existingReviews.size > 0) {
    flags.push('Duplicate review text detected');
    approved = false;
  }

  return { approved, flags };
}

/**
 * Send notification to venue owner about new review
 */
async function sendReviewNotification(
  venueId: string,
  reviewId: string,
  review: any
): Promise<void> {
  // Get venue owner info
  const venueDoc = await admin.firestore().collection('venues').doc(venueId).get();

  if (!venueDoc.exists) {
    return;
  }

  const venue = venueDoc.data();
  if (!venue?.ownerId) {
    return;
  }

  // Create notification document
  await admin
    .firestore()
    .collection('notifications')
    .add({
      userId: venue.ownerId,
      type: 'new_review',
      title: 'New Review',
      message: `${review.userName} left a ${review.rating}-star review for ${venue.name}`,
      data: {
        venueId,
        reviewId,
        rating: review.rating,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // In production, you'd also send a push notification here
  // using Firebase Cloud Messaging (FCM)
}
