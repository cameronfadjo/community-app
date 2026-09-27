// Firebase Cloud Functions entry point
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all cloud functions
export { onUserCreate } from './auth/onUserCreate';
export { onPerkRedemptionWrite } from './perks/onPerkRedemptionWrite';
export { deleteMyAccount } from './account/deleteMyAccount';
