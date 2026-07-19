import { OfferAnalytics } from '../../types';
import {
  COLLECTIONS,
  queryDocuments,
  where,
  orderBy,
} from '../firebase/firestore';

/**
 * Get aggregated analytics for a specific offer
 */
export const getOfferAnalytics = async (
  offerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<OfferAnalytics[]> => {
  const constraints = [where('offerId', '==', offerId)];

  if (startDate) {
    constraints.push(where('period.start', '>=', startDate));
  }

  if (endDate) {
    constraints.push(where('period.end', '<=', endDate));
  }

  constraints.push(orderBy('period.start', 'desc'));

  return await queryDocuments<OfferAnalytics>(
    COLLECTIONS.AGGREGATED_ANALYTICS,
    constraints
  );
};

/**
 * Get aggregated analytics for all offers at a venue
 */
export const getVenueAnalytics = async (
  venueId: string,
  startDate?: Date,
  endDate?: Date
): Promise<OfferAnalytics[]> => {
  const constraints = [where('venueId', '==', venueId)];

  if (startDate) {
    constraints.push(where('period.start', '>=', startDate));
  }

  if (endDate) {
    constraints.push(where('period.end', '<=', endDate));
  }

  constraints.push(orderBy('period.start', 'desc'));

  return await queryDocuments<OfferAnalytics>(
    COLLECTIONS.AGGREGATED_ANALYTICS,
    constraints
  );
};

/**
 * Get analytics summary for a specific offer
 * Returns aggregated totals across all time periods
 */
export const getOfferAnalyticsSummary = async (
  offerId: string,
  days: number = 30
): Promise<{
  totalImpressions: number;
  totalClicks: number;
  totalClaims: number;
  totalRedemptions: number;
  avgClickThroughRate: number;
  avgClaimRate: number;
  avgRedemptionRate: number;
  avgOverallConversionRate: number;
  peakDays: string[];
  peakHours: string[];
  proximityDistribution: Record<string, number>;
}> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await getOfferAnalytics(offerId, startDate);

  if (analytics.length === 0) {
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalClaims: 0,
      totalRedemptions: 0,
      avgClickThroughRate: 0,
      avgClaimRate: 0,
      avgRedemptionRate: 0,
      avgOverallConversionRate: 0,
      peakDays: [],
      peakHours: [],
      proximityDistribution: {},
    };
  }

  // Sum up totals
  const totals = analytics.reduce(
    (acc, curr) => ({
      impressions: acc.impressions + curr.metrics.impressions,
      clicks: acc.clicks + curr.metrics.clicks,
      claims: acc.claims + curr.metrics.claims,
      redemptions: acc.redemptions + curr.metrics.redemptions,
      ctrSum: acc.ctrSum + curr.metrics.clickThroughRate,
      claimRateSum: acc.claimRateSum + curr.metrics.claimRate,
      redemptionRateSum: acc.redemptionRateSum + curr.metrics.redemptionRate,
      conversionRateSum: acc.conversionRateSum + curr.metrics.overallConversionRate,
    }),
    {
      impressions: 0,
      clicks: 0,
      claims: 0,
      redemptions: 0,
      ctrSum: 0,
      claimRateSum: 0,
      redemptionRateSum: 0,
      conversionRateSum: 0,
    }
  );

  const count = analytics.length;

  // Aggregate temporal patterns
  const dayFrequency = new Map<string, number>();
  const hourFrequency = new Map<string, number>();

  analytics.forEach(a => {
    if (a.temporalPatterns?.peakDays) {
      a.temporalPatterns.peakDays.forEach(day => {
        dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1);
      });
    }
    if (a.temporalPatterns?.peakHours) {
      a.temporalPatterns.peakHours.forEach(hour => {
        hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
      });
    }
  });

  const peakDays = Array.from(dayFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  const peakHours = Array.from(hourFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  // Aggregate proximity distribution
  const proximityTotals: Record<string, number> = {};
  let proximityCount = 0;

  analytics.forEach(a => {
    if (a.demographics?.proximityRanges) {
      Object.entries(a.demographics.proximityRanges).forEach(([range, percentage]) => {
        proximityTotals[range] = (proximityTotals[range] || 0) + percentage;
      });
      proximityCount++;
    }
  });

  const proximityDistribution: Record<string, number> = {};
  if (proximityCount > 0) {
    Object.entries(proximityTotals).forEach(([range, sum]) => {
      proximityDistribution[range] = parseFloat((sum / proximityCount).toFixed(1));
    });
  }

  return {
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    totalClaims: totals.claims,
    totalRedemptions: totals.redemptions,
    avgClickThroughRate: parseFloat((totals.ctrSum / count).toFixed(2)),
    avgClaimRate: parseFloat((totals.claimRateSum / count).toFixed(2)),
    avgRedemptionRate: parseFloat((totals.redemptionRateSum / count).toFixed(2)),
    avgOverallConversionRate: parseFloat((totals.conversionRateSum / count).toFixed(2)),
    peakDays,
    peakHours,
    proximityDistribution,
  };
};

/**
 * Get analytics summary for all offers at a venue
 */
export const getVenueAnalyticsSummary = async (
  venueId: string,
  days: number = 30
): Promise<{
  totalOffers: number;
  totalImpressions: number;
  totalClicks: number;
  totalClaims: number;
  totalRedemptions: number;
  avgClickThroughRate: number;
  avgClaimRate: number;
  avgRedemptionRate: number;
  avgOverallConversionRate: number;
  topPerformingOffers: Array<{
    offerId: string;
    impressions: number;
    redemptions: number;
    conversionRate: number;
  }>;
}> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await getVenueAnalytics(venueId, startDate);

  if (analytics.length === 0) {
    return {
      totalOffers: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalClaims: 0,
      totalRedemptions: 0,
      avgClickThroughRate: 0,
      avgClaimRate: 0,
      avgRedemptionRate: 0,
      avgOverallConversionRate: 0,
      topPerformingOffers: [],
    };
  }

  // Group by offer to calculate per-offer totals
  const offerTotals = new Map<string, {
    impressions: number;
    clicks: number;
    claims: number;
    redemptions: number;
  }>();

  analytics.forEach(a => {
    if (!offerTotals.has(a.offerId)) {
      offerTotals.set(a.offerId, {
        impressions: 0,
        clicks: 0,
        claims: 0,
        redemptions: 0,
      });
    }

    const totals = offerTotals.get(a.offerId)!;
    totals.impressions += a.metrics.impressions;
    totals.clicks += a.metrics.clicks;
    totals.claims += a.metrics.claims;
    totals.redemptions += a.metrics.redemptions;
  });

  // Calculate top performing offers
  const topPerformingOffers = Array.from(offerTotals.entries())
    .map(([offerId, totals]) => ({
      offerId,
      impressions: totals.impressions,
      redemptions: totals.redemptions,
      conversionRate:
        totals.impressions > 0
          ? parseFloat(((totals.redemptions / totals.impressions) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  // Aggregate venue totals
  const venueTotals = analytics.reduce(
    (acc, curr) => ({
      impressions: acc.impressions + curr.metrics.impressions,
      clicks: acc.clicks + curr.metrics.clicks,
      claims: acc.claims + curr.metrics.claims,
      redemptions: acc.redemptions + curr.metrics.redemptions,
      ctrSum: acc.ctrSum + curr.metrics.clickThroughRate,
      claimRateSum: acc.claimRateSum + curr.metrics.claimRate,
      redemptionRateSum: acc.redemptionRateSum + curr.metrics.redemptionRate,
      conversionRateSum: acc.conversionRateSum + curr.metrics.overallConversionRate,
    }),
    {
      impressions: 0,
      clicks: 0,
      claims: 0,
      redemptions: 0,
      ctrSum: 0,
      claimRateSum: 0,
      redemptionRateSum: 0,
      conversionRateSum: 0,
    }
  );

  const count = analytics.length;

  return {
    totalOffers: offerTotals.size,
    totalImpressions: venueTotals.impressions,
    totalClicks: venueTotals.clicks,
    totalClaims: venueTotals.claims,
    totalRedemptions: venueTotals.redemptions,
    avgClickThroughRate: parseFloat((venueTotals.ctrSum / count).toFixed(2)),
    avgClaimRate: parseFloat((venueTotals.claimRateSum / count).toFixed(2)),
    avgRedemptionRate: parseFloat((venueTotals.redemptionRateSum / count).toFixed(2)),
    avgOverallConversionRate: parseFloat((venueTotals.conversionRateSum / count).toFixed(2)),
    topPerformingOffers,
  };
};

/**
 * Get time series data for offer performance
 * Useful for charts showing performance over time
 */
export const getOfferPerformanceTimeSeries = async (
  offerId: string,
  days: number = 30
): Promise<Array<{
  date: string;
  impressions: number;
  clicks: number;
  claims: number;
  redemptions: number;
  conversionRate: number;
}>> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await getOfferAnalytics(offerId, startDate);

  return analytics.map(a => ({
    date: a.period.start.toDate().toISOString().split('T')[0],
    impressions: a.metrics.impressions,
    clicks: a.metrics.clicks,
    claims: a.metrics.claims,
    redemptions: a.metrics.redemptions,
    conversionRate: a.metrics.overallConversionRate,
  }));
};
