import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Collections holding records tied to one person by a `userId` field.
// Reviews and check-ins are from earlier versions of the app.
const PERSONAL_COLLECTIONS = ['perkRedemptions', 'reviews', 'checkIns'];

// Firestore allows at most 500 writes in one batch
const BATCH_SIZE = 400;

const deleteWhereUserIs = async (collection: string, uid: string): Promise<number> => {
  const db = admin.firestore();
  let deleted = 0;

  // Repeat until nothing is left, in case there are more than one batch's worth
  for (;;) {
    const snapshot = await db
      .collection(collection)
      .where('userId', '==', uid)
      .limit(BATCH_SIZE)
      .get();
    if (snapshot.empty) {
      return deleted;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
};

/**
 * Cloud Function for someone to delete their own account
 * Callable function. Removes their records, their profile, their uploaded
 * photo, and finally their sign-in.
 *
 * Runs on the server so every record is removed together, and so it works
 * without asking the person to sign in again first.
 */
export const deleteMyAccount = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const role = context.auth.token.role;

  // Partner and admin accounts own events and access, so they are closed by hand
  if (role === 'partner' || role === 'admin') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Partner and admin accounts are closed by contacting support'
    );
  }

  try {
    const counts: Record<string, number> = {};
    for (const collection of PERSONAL_COLLECTIONS) {
      counts[collection] = await deleteWhereUserIs(collection, uid);
    }

    await admin.firestore().collection('users').doc(uid).delete();
    await admin.storage().bucket().deleteFiles({ prefix: `users/${uid}/` });

    // Last, so a failure above can be retried while they can still sign in
    await admin.auth().deleteUser(uid);

    // Logs the counts only, nothing that identifies the person
    functions.logger.info('Account deleted', { counts });

    return { success: true };
  } catch (error) {
    functions.logger.error('Error deleting account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account');
  }
});
