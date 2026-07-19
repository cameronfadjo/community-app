import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface ConversionFunnelChartProps {
  impressions: number;
  clicks: number;
  claims: number;
  redemptions: number;
  clickThroughRate: number;
  claimRate: number;
  redemptionRate: number;
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  impressions,
  clicks,
  claims,
  redemptions,
  clickThroughRate,
  claimRate,
  redemptionRate,
}) => {
  const stages = [
    {
      label: 'Impressions',
      value: impressions,
      percentage: 100,
      icon: '👁',
      description: 'Users who saw the offer',
    },
    {
      label: 'Clicks',
      value: clicks,
      percentage: clickThroughRate,
      icon: '👆',
      description: 'Users who clicked for details',
    },
    {
      label: 'Claims',
      value: claims,
      percentage: claimRate,
      icon: '🎫',
      description: 'Users who claimed the offer',
    },
    {
      label: 'Redemptions',
      value: redemptions,
      percentage: redemptionRate,
      icon: '✓',
      description: 'Users who redeemed in-venue',
    },
  ];

  const getBarWidth = (percentage: number) => {
    // Minimum 10% width for visibility
    return Math.max(percentage, 10);
  };

  const getBarColor = (index: number) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary || '#9C27B0',
      COLORS.accent || '#FF9800',
      COLORS.success || '#4CAF50',
    ];
    return colors[index];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversion Funnel</Text>

      <View style={styles.funnel}>
        {stages.map((stage, index) => (
          <View key={stage.label} style={styles.stage}>
            {/* Stage Header */}
            <View style={styles.stageHeader}>
              <View style={styles.stageInfo}>
                <Text style={styles.stageIcon}>{stage.icon}</Text>
                <View>
                  <Text style={styles.stageLabel}>{stage.label}</Text>
                  <Text style={styles.stageDescription}>{stage.description}</Text>
                </View>
              </View>
              <View style={styles.stageMetrics}>
                <Text style={styles.stageValue}>{stage.value.toLocaleString()}</Text>
                {index > 0 && (
                  <Text style={styles.stagePercentage}>
                    {stage.percentage.toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>

            {/* Visual Bar */}
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${getBarWidth(stage.percentage)}%`,
                    backgroundColor: getBarColor(index),
                  },
                ]}
              />
            </View>

            {/* Drop-off indicator */}
            {index < stages.length - 1 && (
              <View style={styles.dropoff}>
                <Text style={styles.dropoffText}>
                  {((1 - stages[index + 1].percentage / 100) * 100).toFixed(0)}% drop-off
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Overall Conversion Rate */}
      <View style={styles.overallConversion}>
        <Text style={styles.overallLabel}>Overall Conversion Rate</Text>
        <Text style={styles.overallValue}>
          {impressions > 0 ? ((redemptions / impressions) * 100).toFixed(2) : 0}%
        </Text>
        <Text style={styles.overallSubtext}>
          {redemptions} redemptions from {impressions.toLocaleString()} impressions
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  funnel: {
    gap: SPACING.lg,
  },
  stage: {
    gap: SPACING.sm,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  stageIcon: {
    fontSize: 24,
  },
  stageLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  stageDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  stageMetrics: {
    alignItems: 'flex-end',
  },
  stageValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  stagePercentage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  dropoff: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  dropoffText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  overallConversion: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  overallLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  overallValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  overallSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
