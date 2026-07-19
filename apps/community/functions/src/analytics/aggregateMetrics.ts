import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Scheduled function that runs daily to aggregate offer analytics
 * Runs at midnight UTC every day
 */
export const aggregateOfferMetrics = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Calculate yesterday's date range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    console.log(`Aggregating metrics for ${yesterday.toISOString()} to ${endOfYesterday.toISOString()}`);

    try {
      // Get all analytics events from yesterday
      const eventsSnapshot = await db
        .collection('analytics_events')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(yesterday))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endOfYesterday))
        .get();

      console.log(`Found ${eventsSnapshot.size} events to process`);

      // Group events by offer and venue
      const offerMetrics = new Map<string, {
        offerId: string;
        venueId: string;
        views: Set<string>; // sessionIds to count unique views
        clicks: Set<string>;
        claims: Set<string>;
        redemptions: Set<string>;
        events: any[];
      }>();

      eventsSnapshot.forEach(doc => {
        const event = doc.data();
        const key = `${event.offerId}_${event.venueId}`;

        if (!offerMetrics.has(key)) {
          offerMetrics.set(key, {
            offerId: event.offerId,
            venueId: event.venueId,
            views: new Set(),
            clicks: new Set(),
            claims: new Set(),
            redemptions: new Set(),
            events: [],
          });
        }

        const metrics = offerMetrics.get(key)!;
        metrics.events.push(event);

        // Track unique sessions for each event type
        switch (event.type) {
          case 'offer_view':
            metrics.views.add(event.sessionId);
            break;
          case 'offer_click':
            metrics.clicks.add(event.sessionId);
            break;
          case 'offer_claim':
            metrics.claims.add(event.sessionId);
            break;
          case 'offer_redeem':
            metrics.redemptions.add(event.sessionId);
            break;
        }
      });

      console.log(`Aggregating metrics for ${offerMetrics.size} offers`);

      // Calculate and store aggregated metrics
      const batch = db.batch();
      let batchCount = 0;
      const MAX_BATCH_SIZE = 500;

      for (const [key, data] of offerMetrics.entries()) {
        const impressions = data.views.size;
        const clicks = data.clicks.size;
        const claims = data.claims.size;
        const redemptions = data.redemptions.size;

        // Calculate conversion rates
        const clickThroughRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const claimRate = clicks > 0 ? (claims / clicks) * 100 : 0;
        const redemptionRate = claims > 0 ? (redemptions / claims) * 100 : 0;
        const overallConversionRate = impressions > 0 ? (redemptions / impressions) * 100 : 0;

        // Analyze temporal patterns
        const temporalPatterns = analyzeTemporalPatterns(data.events);

        // Analyze proximity patterns (anonymized)
        const proximityPatterns = analyzeProximityPatterns(data.events);

        // Create aggregated analytics document
        const analyticsId = `${data.offerId}_${yesterday.toISOString().split('T')[0]}`;
        const analyticsRef = db.collection('aggregated_analytics').doc(analyticsId);

        batch.set(analyticsRef, {
          offerId: data.offerId,
          venueId: data.venueId,
          period: {
            start: admin.firestore.Timestamp.fromDate(yesterday),
            end: admin.firestore.Timestamp.fromDate(endOfYesterday),
          },
          metrics: {
            impressions,
            clicks,
            claims,
            redemptions,
            clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
            claimRate: parseFloat(claimRate.toFixed(2)),
            redemptionRate: parseFloat(redemptionRate.toFixed(2)),
            overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
          },
          demographics: {
            proximityRanges: proximityPatterns,
          },
          temporalPatterns,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} analytics documents`);
          batchCount = 0;
        }
      }

      // Commit remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} analytics documents`);
      }

      // Clean up old analytics events (optional - keep last 90 days)
      await cleanupOldEvents(db, 90);

      console.log('Analytics aggregation completed successfully');
      return null;
    } catch (error) {
      console.error('Error aggregating metrics:', error);
      throw error;
    }
  });

/**
 * Analyze temporal patterns from events
 */
function analyzeTemporalPatterns(events: any[]): {
  peakDays: string[];
  peakHours: string[];
} {
  const dayCount = new Map<string, number>();
  const hourCount = new Map<string, number>();

  events.forEach(event => {
    const timestamp = event.timestamp.toDate();

    // Track day of week
    const dayOfWeek = timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    dayCount.set(dayOfWeek, (dayCount.get(dayOfWeek) || 0) + 1);

    // Track hour of day
    const hour = timestamp.getHours();
    const hourRange = `${hour}:00-${hour + 1}:00`;
    hourCount.set(hourRange, (hourCount.get(hourRange) || 0) + 1);
  });

  // Get top 3 peak days
  const peakDays = Array.from(dayCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Get top 3 peak hours
  const peakHours = Array.from(hourCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return { peakDays, peakHours };
}

/**
 * Analyze proximity patterns (anonymized)
 * Groups users by distance ranges without revealing specific locations
 */
function analyzeProximityPatterns(events: any[]): Record<string, number> {
  const proximityRanges = {
    '<0.5mi': 0,
    '0.5-1mi': 0,
    '1-3mi': 0,
    '3-5mi': 0,
    '5+mi': 0,
  };

  // This would require user location data from metadata
  // For now, we'll return empty patterns as we need to implement
  // location tracking in the analytics events first

  events.forEach(event => {
    if (event.metadata?.distance) {
      const distance = event.metadata.distance; // in miles

      if (distance < 0.5) proximityRanges['<0.5mi']++;
      else if (distance < 1) proximityRanges['0.5-1mi']++;
      else if (distance < 3) proximityRanges['1-3mi']++;
      else if (distance < 5) proximityRanges['3-5mi']++;
      else proximityRanges['5+mi']++;
    }
  });

  // Convert to percentages
  const total = Object.values(proximityRanges).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return {}; // No location data available
  }

  const percentages: Record<string, number> = {};
  Object.entries(proximityRanges).forEach(([range, count]) => {
    percentages[range] = parseFloat(((count / total) * 100).toFixed(1));
  });

  return percentages;
}

/**
 * Clean up old analytics events to save storage
 */
async function cleanupOldEvents(db: admin.firestore.Firestore, daysToKeep: number): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const oldEventsSnapshot = await db
    .collection('analytics_events')
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
    .limit(500) // Delete in batches to avoid timeout
    .get();

  if (oldEventsSnapshot.empty) {
    console.log('No old events to clean up');
    return;
  }

  console.log(`Cleaning up ${oldEventsSnapshot.size} old events`);

  const batch = db.batch();
  oldEventsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${oldEventsSnapshot.size} old events`);
}
