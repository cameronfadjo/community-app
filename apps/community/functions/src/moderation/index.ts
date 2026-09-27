import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const assertIsAdmin = (context: functions.https.CallableContext) => {
  if (context.auth?.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }
};

/**
 * Cloud Function for admins to moderate user profiles
 * Callable function that requires admin privileges
 */
export const moderateUser = functions.https.onCall(async (data, context) => {
  // Verify the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  assertIsAdmin(context);

  const { userId, status } = data;

  if (!userId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  if (!['approved', 'rejected'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid moderation status');
  }

  try {
    // Update user's moderation status
    await admin.firestore().collection('users').doc(userId).update({
      moderationStatus: status,
      verified: status === 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`User ${userId} moderation status updated to ${status}`);

    // TODO: Send email notification to user about moderation decision
    // TODO: Log moderation action for audit trail

    return { success: true, userId, status };
  } catch (error) {
    functions.logger.error('Error moderating user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to moderate user');
  }
});

/**
 * Cloud Function for admins to moderate venue submissions
 * Callable function that requires admin privileges
 */
export const moderateVenue = functions.https.onCall(async (data, context) => {
  // Verify the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  assertIsAdmin(context);

  const { venueId, status } = data;

  if (!venueId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  if (!['approved', 'rejected'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid moderation status');
  }

  try {
    // Update venue's moderation status
    await admin.firestore().collection('venues').doc(venueId).update({
      moderationStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`Venue ${venueId} moderation status updated to ${status}`);

    // TODO: Send notification to venue submitter
    // TODO: Log moderation action for audit trail

    return { success: true, venueId, status };
  } catch (error) {
    functions.logger.error('Error moderating venue:', error);
    throw new functions.https.HttpsError('internal', 'Failed to moderate venue');
  }
});
