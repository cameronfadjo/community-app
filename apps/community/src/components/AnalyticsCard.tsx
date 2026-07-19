import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number; // Percentage change
    period: string; // "vs last week", "vs last month"
  };
  icon?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return COLORS.success || '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'info':
        return COLORS.primary;
      default:
        return COLORS.text;
    }
  };

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return COLORS.success || '#4CAF50';
    if (trendValue < 0) return '#F44336';
    return COLORS.textSecondary;
  };

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return '↗';
    if (trendValue < 0) return '↘';
    return '→';
  };

  return (
    <View style={styles.card}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${getVariantColor()}20` }]}>
          <Text style={[styles.icon, { color: getVariantColor() }]}>{icon}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.value, { color: getVariantColor() }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>

        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {trend && (
          <View style={styles.trendContainer}>
            <Text style={[styles.trendValue, { color: getTrendColor(trend.value) }]}>
              {getTrendIcon(trend.value)} {Math.abs(trend.value).toFixed(1)}%
            </Text>
            <Text style={styles.trendPeriod}>{trend.period}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  trendValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  trendPeriod: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
