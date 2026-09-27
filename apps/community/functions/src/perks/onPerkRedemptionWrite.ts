import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getPerkStatChange } from './statChange';

/**
 * Cloud Function: Triggered when a perk is unlocked or redeemed
 * - Keeps per-event totals in `eventStats/{eventId}`
 *
 * Organizers read these totals rather than the redemption records, so they
 * never see which accounts unlocked their perk.
 */
export const onPerkRedemptionWrite = functions.firestore
  .document('perkRedemptions/{redemptionId}')
  .onWrite(async (change) => {
    const before = change.before.exists ? change.before.data() : undefined;
    const after = change.after.exists ? change.after.data() : undefined;

    const statChange = getPerkStatChange(before, after);
    if (statChange.unlocked === 0 && statChange.redeemed === 0) {
      return;
    }

    const eventId: string | undefined = after?.eventId;
    if (!eventId) {
      functions.logger.warn('Perk redemption has no eventId', { id: change.after.id });
      return;
    }

    try {
      const event = await admin.firestore().collection('events').doc(eventId).get();
      if (!event.exists) {
        functions.logger.warn(`Perk redemption for missing event ${eventId}`);
        return;
      }

      await admin
        .firestore()
        .collection('eventStats')
        .doc(eventId)
        .set(
          {
            eventId,
            organizerId: event.data()?.organizerId,
            perkUnlocked: admin.firestore.FieldValue.increment(statChange.unlocked),
            perkRedeemed: admin.firestore.FieldValue.increment(statChange.redeemed),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (error) {
      functions.logger.error(`Error updating perk totals for event ${eventId}:`, error);
      throw error;
    }
  });
