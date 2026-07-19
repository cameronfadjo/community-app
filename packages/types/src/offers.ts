import type { Timestamp } from 'firebase/firestore';

export type OfferType = 'percentage' | 'fixed_amount' | 'free_item' | 'upgrade' | 'bogo';
export type PartnerTier = 'standard' | 'premium' | 'enterprise';
export type RedemptionStatus = 'pending' | 'validated' | 'expired' | 'used';

export interface Offer {
  id: string;
  venueId: string;
  /** Denormalized */
  venueName: string;
  /** Denormalized */
  venueCategory: string;

  // Offer details
  title: string;
  description: string;
  type: OfferType;
  /** Percentage (25), fixed amount (10.00), or quantity (1 for BOGO) */
  value: number;

  // Display
  /** "25% OFF", "$10 OFF", "FREE DRINK" */
  badge: string;
  terms: string;

  // Availability
  validFrom: Timestamp;
  validUntil: Timestamp;
  maxRedemptions: number;
  maxRedemptionsPerUser: number;
  currentRedemptions: number;

  // Partnership
  partnerTier: PartnerTier;
  /** Featured offers get premium placement */
  featured: boolean;

  // Analytics counters (running totals)
  impressions: number;
  clicks: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OfferRedemption {
  id: string;
  offerId: string;
  userId: string;
  venueId: string;

  /** 6-digit unique redemption code */
  code: string;
  /** QR code data URL */
  qrCode: string;
  status: RedemptionStatus;

  claimedAt: Timestamp;
  validatedAt?: Timestamp;
  /** Venue staff ID */
  validatedBy?: string;
  /** Expires X minutes after claiming */
  expiresAt: Timestamp;

  metadata: {
    deviceType?: string;
    appVersion?: string;
    userLocation?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface OfferFormData {
  title: string;
  description: string;
  type: OfferType;
  value: number;
  terms: string;
  validFrom: Date;
  validUntil: Date;
  maxRedemptions: number;
  maxRedemptionsPerUser: number;
}

export interface ClaimedOffer extends Offer {
  redemption: OfferRedemption;
  /** Milliseconds until expiration */
  timeRemaining?: number;
}

export type AnalyticsEventType = 'offer_view' | 'offer_click' | 'offer_claim' | 'offer_redeem';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  offerId: string;
  venueId: string;
  /** Will be hashed for privacy */
  userId: string;
  sessionId: string;
  timestamp: Timestamp;
  metadata: {
    deviceType?: string;
    appVersion?: string;
    /** How they found the offer (explore, venue, nearby, etc.) */
    referrer?: string;
  };
}

export interface OfferAnalytics {
  offerId: string;
  venueId: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };

  metrics: {
    impressions: number;
    clicks: number;
    claims: number;
    redemptions: number;

    /** clicks / impressions */
    clickThroughRate: number;
    /** claims / clicks */
    claimRate: number;
    /** redemptions / claims */
    redemptionRate: number;
    /** redemptions / impressions */
    overallConversionRate: number;
  };

  demographics?: {
    /** "18-24": 30 */
    ageRanges?: Record<string, number>;
    /** "<1mi": 50 */
    proximityRanges?: Record<string, number>;
  };

  temporalPatterns?: {
    peakDays?: string[];
    peakHours?: string[];
  };
}
