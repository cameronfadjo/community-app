// Firebase Cloud Functions entry point
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all cloud functions
export { onUserCreate } from './auth/onUserCreate';
export { updateVenueRating } from './triggers/updateVenueRating';
export { moderateUser, moderateVenue } from './moderation';
export { onReviewCreate } from './reviews/onReviewCreate';
export { onReviewUpdate } from './reviews/onReviewUpdate';
export { onReviewDelete } from './reviews/onReviewDelete';
export { onPerkRedemptionWrite } from './perks/onPerkRedemptionWrite';
export { deleteMyAccount } from './account/deleteMyAccount';
