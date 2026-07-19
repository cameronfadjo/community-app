import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Send notification when a new offer is created near a user's favorite venues
 * Triggered when a new offer is added to Firestore
 */
export const onOfferCreated = functions.firestore
  .document('offers/{offerId}')
  .onCreate(async (snapshot, context) => {
    const offer = snapshot.data();
    const offerId = context.params.offerId;

    console.log(`New offer created: ${offerId} for venue ${offer.venueId}`);

    try {
      const db = admin.firestore();

      // Get all users who have favorited this venue
      const usersSnapshot = await db
        .collection('users')
        .where('favorites', 'array-contains', offer.venueId)
        .get();

      if (usersSnapshot.empty) {
        console.log('No users have favorited this venue');
        return null;
      }

      console.log(`Found ${usersSnapshot.size} users who favorited this venue`);

      // Create notification for each user
      const batch = db.batch();
      const notificationPromises: Promise<void>[] = [];

      usersSnapshot.forEach(userDoc => {
        const userId = userDoc.id;
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create in-app notification
        const notificationRef = db.collection('notifications').doc(notificationId);
        batch.set(notificationRef, {
          userId,
          type: 'new_offer',
          title: `New Offer at ${offer.venueName}`,
          message: `${offer.badge} - ${offer.title}`,
          data: {
            offerId,
            venueId: offer.venueId,
            offerBadge: offer.badge,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // TODO: Send push notification if user has FCM token
        // This would require storing FCM tokens in user documents
        // and using admin.messaging().send()
      });

      await batch.commit();
      console.log(`Created ${usersSnapshot.size} notifications`);

      return null;
    } catch (error) {
      console.error('Error creating offer notifications:', error);
      throw error;
    }
  });

/**
 * Notify user when their claimed offer is about to expire
 * Scheduled function that runs every 5 minutes
 */
export const notifyExpiringOffers = functions.pubsub
  .schedule('*/5 * * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Find offers expiring in the next 10 minutes
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    console.log(`Checking for offers expiring between ${now} and ${tenMinutesFromNow}`);

    try {
      const redemptionsSnapshot = await db
        .collection('redemptions')
        .where('status', '==', 'pending')
        .where('expiresAt', '>', admin.firestore.Timestamp.fromDate(now))
        .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(tenMinutesFromNow))
        .get();

      if (redemptionsSnapshot.empty) {
        console.log('No expiring offers found');
        return null;
      }

      console.log(`Found ${redemptionsSnapshot.size} expiring offers`);

      const batch = db.batch();
      const notificationsSent = new Set<string>(); // Track to avoid duplicates

      redemptionsSnapshot.forEach(redemptionDoc => {
        const redemption = redemptionDoc.data();
        const notificationKey = `${redemption.userId}_${redemption.offerId}`;

        // Avoid sending duplicate notifications
        if (notificationsSent.has(notificationKey)) {
          return;
        }

        notificationsSent.add(notificationKey);

        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationRef = db.collection('notifications').doc(notificationId);

        const timeRemaining = redemption.expiresAt.toDate().getTime() - now.getTime();
        const minutesRemaining = Math.floor(timeRemaining / 60000);

        batch.set(notificationRef, {
          userId: redemption.userId,
          type: 'offer_expiring',
          title: 'Your Offer Is Expiring Soon!',
          message: `Your offer expires in ${minutesRemaining} minutes. Redeem it now!`,
          data: {
            redemptionId: redemption.id,
            offerId: redemption.offerId,
            venueId: redemption.venueId,
            code: redemption.code,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // TODO: Send push notification
      });

      await batch.commit();
      console.log(`Sent ${notificationsSent.size} expiring offer notifications`);

      return null;
    } catch (error) {
      console.error('Error sending expiring offer notifications:', error);
      throw error;
    }
  });

/**
 * Notify venue owner when their offer is redeemed
 */
export const onOfferRedeemed = functions.firestore
  .document('redemptions/{redemptionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to validated
    if (before.status !== 'validated' && after.status === 'validated') {
      console.log(`Offer ${after.offerId} was redeemed by user ${after.userId}`);

      try {
        const db = admin.firestore();

        // Get the offer to find venue info
        const offerDoc = await db.collection('offers').doc(after.offerId).get();
        if (!offerDoc.exists) {
          console.log('Offer not found');
          return null;
        }

        const offer = offerDoc.data()!;

        // Get venue owner user ID
        const venueDoc = await db.collection('venues').doc(offer.venueId).get();
        if (!venueDoc.exists) {
          console.log('Venue not found');
          return null;
        }

        const venue = venueDoc.data()!;
        const ownerId = venue.submittedBy; // Assuming venue owner is the submitter

        if (!ownerId) {
          console.log('No owner ID found for venue');
          return null;
        }

        // Create notification for venue owner
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.collection('notifications').doc(notificationId).set({
          userId: ownerId,
          type: 'offer_redeemed',
          title: 'Offer Redeemed!',
          message: `A customer redeemed "${offer.title}" at ${venue.name}`,
          data: {
            redemptionId: context.params.redemptionId,
            offerId: after.offerId,
            venueId: offer.venueId,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Notified venue owner ${ownerId} of redemption`);

        // TODO: Send push notification to venue owner

        return null;
      } catch (error) {
        console.error('Error sending redemption notification:', error);
        throw error;
      }
    }

    return null;
  });
