import { Offer, OfferRedemption, ClaimedOffer, AnalyticsEventType } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  queryDocuments,
  updateDocument,
  where,
  orderBy,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { getVenue } from './venues';

/**
 * Get all active offers for a venue
 */
export const getVenueOffers = async (venueId: string): Promise<Offer[]> => {
  const now = new Date();

  const offers = await queryDocuments<Offer>(COLLECTIONS.OFFERS, [
    where('venueId', '==', venueId),
    where('validUntil', '>', now),
    orderBy('validUntil', 'asc'),
    orderBy('featured', 'desc'),
  ]);

  // Filter out offers that have reached max redemptions
  return offers.filter(offer => offer.currentRedemptions < offer.maxRedemptions);
};

/**
 * Get a specific offer by ID
 */
export const getOffer = async (offerId: string): Promise<Offer | null> => {
  return await readDocument<Offer>(COLLECTIONS.OFFERS, offerId);
};

/**
 * Get all offers (for explore/discovery)
 */
export const getAllActiveOffers = async (limit: number = 50): Promise<Offer[]> => {
  const now = new Date();

  return await queryDocuments<Offer>(COLLECTIONS.OFFERS, [
    where('validUntil', '>', now),
    orderBy('validUntil', 'asc'),
    orderBy('featured', 'desc'),
  ]);
};

/**
 * Claim an offer (generate redemption code)
 */
export const claimOffer = async (offerId: string): Promise<OfferRedemption> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to claim offers');
  }

  // Get the offer
  const offer = await getOffer(offerId);
  if (!offer) {
    throw new Error('Offer not found');
  }

  // Check if offer is still valid
  const now = new Date();
  if (offer.validUntil.toDate() < now) {
    throw new Error('This offer has expired');
  }

  // Check if max redemptions reached
  if (offer.currentRedemptions >= offer.maxRedemptions) {
    throw new Error('This offer is no longer available');
  }

  // Check user's redemption count for this offer
  const userRedemptions = await getUserOfferRedemptions(currentUser.uid, offerId);
  if (userRedemptions.length >= offer.maxRedemptionsPerUser) {
    throw new Error('You have already used this offer the maximum number of times');
  }

  // Generate unique 6-digit code
  const code = generateRedemptionCode();

  // QR code would contain JSON data for venue scanning
  const qrCodeData = JSON.stringify({
    redemptionId: `redemption_${Date.now()}`,
    offerId,
    userId: currentUser.uid,
    code,
    timestamp: Date.now(),
  });

  // Redemption expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const redemptionId = `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const redemption: Omit<OfferRedemption, 'claimedAt' | 'expiresAt'> = {
    id: redemptionId,
    offerId,
    userId: currentUser.uid,
    venueId: offer.venueId,
    code,
    qrCode: qrCodeData,
    status: 'pending',
    metadata: {
      deviceType: 'mobile', // Could be detected from platform
      appVersion: '1.0.0',
    },
  };

  // Create redemption document
  await createDocument(COLLECTIONS.REDEMPTIONS, redemptionId, {
    ...redemption,
    expiresAt,
  });

  // Increment offer redemption count
  await updateDocument(COLLECTIONS.OFFERS, offerId, {
    currentRedemptions: offer.currentRedemptions + 1,
  });

  // Track analytics event
  await trackAnalyticsEvent('offer_claim', offerId, offer.venueId);

  // Return redemption with dates
  return {
    ...redemption,
    claimedAt: new Date() as any,
    expiresAt: expiresAt as any,
  };
};

/**
 * Get user's redemptions for a specific offer
 */
export const getUserOfferRedemptions = async (
  userId: string,
  offerId: string
): Promise<OfferRedemption[]> => {
  return await queryDocuments<OfferRedemption>(COLLECTIONS.REDEMPTIONS, [
    where('userId', '==', userId),
    where('offerId', '==', offerId),
  ]);
};

/**
 * Get all user's claimed offers
 */
export const getUserClaimedOffers = async (): Promise<ClaimedOffer[]> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }

  // Get all user redemptions
  const redemptions = await queryDocuments<OfferRedemption>(COLLECTIONS.REDEMPTIONS, [
    where('userId', '==', currentUser.uid),
    orderBy('claimedAt', 'desc'),
  ]);

  // Fetch offer details for each redemption
  const claimedOffers: ClaimedOffer[] = [];

  for (const redemption of redemptions) {
    const offer = await getOffer(redemption.offerId);
    if (offer) {
      const now = Date.now();
      const expiresAtMs = redemption.expiresAt.toMillis();
      const timeRemaining = Math.max(0, expiresAtMs - now);

      claimedOffers.push({
        ...offer,
        redemption,
        timeRemaining,
      });
    }
  }

  return claimedOffers;
};

/**
 * Get a specific redemption by ID
 */
export const getRedemption = async (
  redemptionId: string
): Promise<OfferRedemption | null> => {
  return await readDocument<OfferRedemption>(COLLECTIONS.REDEMPTIONS, redemptionId);
};

/**
 * Validate a redemption (called by venue staff)
 */
export const validateRedemption = async (
  redemptionId: string,
  staffId?: string
): Promise<void> => {
  const redemption = await getRedemption(redemptionId);
  if (!redemption) {
    throw new Error('Redemption not found');
  }

  // Check if already used
  if (redemption.status === 'used' || redemption.status === 'validated') {
    throw new Error('This offer has already been redeemed');
  }

  // Check if expired
  const now = new Date();
  if (redemption.expiresAt.toDate() < now) {
    await updateDocument(COLLECTIONS.REDEMPTIONS, redemptionId, {
      status: 'expired',
    });
    throw new Error('This redemption has expired');
  }

  // Mark as validated
  await updateDocument(COLLECTIONS.REDEMPTIONS, redemptionId, {
    status: 'validated',
    validatedAt: now,
    validatedBy: staffId,
  });

  // Track analytics event
  await trackAnalyticsEvent('offer_redeem', redemption.offerId, redemption.venueId);
};

/**
 * Track analytics events
 */
export const trackAnalyticsEvent = async (
  eventType: AnalyticsEventType,
  offerId: string,
  venueId: string,
  metadata?: Record<string, any>
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sessionId = getSessionId(); // Get or create session ID

  await createDocument(COLLECTIONS.ANALYTICS_EVENTS, eventId, {
    type: eventType,
    offerId,
    venueId,
    userId: hashUserId(currentUser.uid), // Hash for privacy
    sessionId,
    timestamp: new Date(),
    metadata: {
      deviceType: 'mobile',
      appVersion: '1.0.0',
      ...metadata,
    },
  });

  // Also increment counter on offer for quick access
  if (eventType === 'offer_view') {
    const offer = await getOffer(offerId);
    if (offer) {
      await updateDocument(COLLECTIONS.OFFERS, offerId, {
        impressions: (offer.impressions || 0) + 1,
      });
    }
  } else if (eventType === 'offer_click') {
    const offer = await getOffer(offerId);
    if (offer) {
      await updateDocument(COLLECTIONS.OFFERS, offerId, {
        clicks: (offer.clicks || 0) + 1,
      });
    }
  }
};

/**
 * Helper: Generate 6-digit redemption code
 */
function generateRedemptionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper: Get or create session ID
 */
let currentSessionId: string | null = null;

function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return currentSessionId;
}

/**
 * Helper: Hash user ID for privacy
 */
function hashUserId(userId: string): string {
  // Simple hash for now - in production, use proper hashing
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(36)}`;
}

/**
 * Check if user has claimed a specific offer
 */
export const hasUserClaimedOffer = async (offerId: string): Promise<boolean> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const redemptions = await getUserOfferRedemptions(currentUser.uid, offerId);
  return redemptions.length > 0;
};

/**
 * Get offer count for a venue
 */
export const getVenueOfferCount = async (venueId: string): Promise<number> => {
  const offers = await getVenueOffers(venueId);
  return offers.length;
};
