import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  AnalyticsCard,
  ConversionFunnelChart,
  TemporalPatternsChart,
} from '../../src/components';
import {
  getVenueAnalyticsSummary,
  getOfferAnalyticsSummary,
} from '../../src/services/api/analytics';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../src/constants/theme';

type TimePeriod = '7' | '30' | '90';

export default function PartnerAnalyticsScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();

  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30');
  const [analytics, setAnalytics] = useState<{
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
  } | null>(null);

  const [selectedOfferAnalytics, setSelectedOfferAnalytics] = useState<{
    peakDays: string[];
    peakHours: string[];
    proximityDistribution: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (venueId) {
      loadAnalytics();
    }
  }, [venueId, timePeriod]);

  const loadAnalytics = async () => {
    if (!venueId) return;

    setLoading(true);
    try {
      const days = parseInt(timePeriod);
      const venueAnalytics = await getVenueAnalyticsSummary(venueId, days);
      setAnalytics(venueAnalytics);

      // Load detailed analytics for top performing offer
      if (venueAnalytics.topPerformingOffers.length > 0) {
        const topOffer = venueAnalytics.topPerformingOffers[0];
        const offerDetails = await getOfferAnalyticsSummary(topOffer.offerId, days);
        setSelectedOfferAnalytics({
          peakDays: offerDetails.peakDays,
          peakHours: offerDetails.peakHours,
          proximityDistribution: offerDetails.proximityDistribution,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTimePeriodSelector = () => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '7', label: '7 Days' },
      { value: '30', label: '30 Days' },
      { value: '90', label: '90 Days' },
    ];

    return (
      <View style={styles.periodSelector}>
        {periods.map(period => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              timePeriod === period.value && styles.periodButtonActive,
            ]}
            onPress={() => setTimePeriod(period.value)}
          >
            <Text
              style={[
                styles.periodButtonText,
                timePeriod === period.value && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Analytics Dashboard' }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ title: 'Analytics Dashboard' }} />
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Analytics Data Yet</Text>
        <Text style={styles.emptyText}>
          Analytics will appear here once your offers start getting views
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Analytics Dashboard',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Partner Analytics</Text>
          <Text style={styles.subtitle}>
            Track the performance of your offers
          </Text>
        </View>

        {/* Time Period Selector */}
        {renderTimePeriodSelector()}

        {/* Overview Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricRow}>
              <AnalyticsCard
                title="Total Impressions"
                value={analytics.totalImpressions}
                icon="👁"
                variant="info"
              />
              <AnalyticsCard
                title="Total Clicks"
                value={analytics.totalClicks}
                icon="👆"
                variant="default"
              />
            </View>

            <View style={styles.metricRow}>
              <AnalyticsCard
                title="Total Claims"
                value={analytics.totalClaims}
                icon="🎫"
                variant="warning"
              />
              <AnalyticsCard
                title="Redemptions"
                value={analytics.totalRedemptions}
                icon="✓"
                variant="success"
              />
            </View>
          </View>
        </View>

        {/* Conversion Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Metrics</Text>

          <AnalyticsCard
            title="Click-Through Rate"
            value={`${analytics.avgClickThroughRate}%`}
            subtitle="Percentage of viewers who clicked"
            icon="📈"
            variant="info"
          />

          <AnalyticsCard
            title="Claim Rate"
            value={`${analytics.avgClaimRate}%`}
            subtitle="Percentage of clickers who claimed"
            icon="🎯"
            variant="warning"
          />

          <AnalyticsCard
            title="Redemption Rate"
            value={`${analytics.avgRedemptionRate}%`}
            subtitle="Percentage of claims that were redeemed"
            icon="💰"
            variant="success"
          />

          <AnalyticsCard
            title="Overall Conversion"
            value={`${analytics.avgOverallConversionRate}%`}
            subtitle="Impressions to redemptions"
            icon="🏆"
            variant="success"
          />
        </View>

        {/* Conversion Funnel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Funnel</Text>
          <ConversionFunnelChart
            impressions={analytics.totalImpressions}
            clicks={analytics.totalClicks}
            claims={analytics.totalClaims}
            redemptions={analytics.totalRedemptions}
            clickThroughRate={analytics.avgClickThroughRate}
            claimRate={analytics.avgClaimRate}
            redemptionRate={analytics.avgRedemptionRate}
          />
        </View>

        {/* Top Performing Offers */}
        {analytics.topPerformingOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performing Offers</Text>
            {analytics.topPerformingOffers.map((offer, index) => (
              <View key={offer.offerId} style={styles.topOfferCard}>
                <View style={styles.topOfferRank}>
                  <Text style={styles.topOfferRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topOfferDetails}>
                  <Text style={styles.topOfferMetric}>
                    {offer.impressions.toLocaleString()} impressions
                  </Text>
                  <Text style={styles.topOfferMetric}>
                    {offer.redemptions} redemptions
                  </Text>
                  <Text style={styles.topOfferConversion}>
                    {offer.conversionRate}% conversion
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Temporal Patterns */}
        {selectedOfferAnalytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <TemporalPatternsChart
              peakDays={selectedOfferAnalytics.peakDays}
              peakHours={selectedOfferAnalytics.peakHours}
            />
          </View>
        )}

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            All user data is anonymized and aggregated to protect privacy while
            providing valuable insights.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: COLORS.textInverse,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    gap: SPACING.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  topOfferCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.md,
  },
  topOfferRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOfferRankText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  topOfferDetails: {
    flex: 1,
  },
  topOfferMetric: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  topOfferConversion: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.success || '#4CAF50',
    marginTop: SPACING.xs,
  },
  privacyNotice: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
