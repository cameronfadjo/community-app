import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function triggered when a new user is created
 * Sets the initial moderation status to 'pending'
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  try {
    // Create user document in Firestore
    await admin.firestore().collection('users').doc(uid).set({
      uid,
      email: email || '',
      displayName: displayName || 'Anonymous',
      photoURL: photoURL || null,
      bio: '',
      verified: false,
      moderationStatus: 'pending',
      subscriptionTier: 'free',
      favorites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`User document created for ${uid}`);

    // TODO: Send welcome email with moderation notice
    // TODO: Notify admins of new user pending approval

    return { success: true };
  } catch (error) {
    functions.logger.error('Error creating user document:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user document');
  }
});
