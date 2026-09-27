import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Cloud Function triggered when a new user is created
 * Accounts start approved; there is no approval step
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;

  try {
    // Create user document in Firestore
    await admin.firestore().collection('users').doc(uid).set({
      uid,
      email: email || '',
      displayName: displayName || 'Anonymous',
      moderationStatus: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`User document created for ${uid}`);

    return { success: true };
  } catch (error) {
    functions.logger.error('Error creating user document:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user document');
  }
});
