import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface TemporalPatternsChartProps {
  peakDays: string[];
  peakHours: string[];
}

export const TemporalPatternsChart: React.FC<TemporalPatternsChartProps> = ({
  peakDays,
  peakHours,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>When Your Offer Performs Best</Text>

      {/* Peak Days */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📅</Text>
          <Text style={styles.sectionTitle}>Peak Days</Text>
        </View>

        {peakDays.length > 0 ? (
          <View style={styles.tagContainer}>
            {peakDays.map((day, index) => (
              <View
                key={day}
                style={[
                  styles.tag,
                  { backgroundColor: index === 0 ? COLORS.primary : COLORS.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: index === 0 ? COLORS.textInverse : COLORS.text },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Not enough data yet</Text>
        )}

        <Text style={styles.hint}>
          Most user engagement happens on these days
        </Text>
      </View>

      {/* Peak Hours */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🕐</Text>
          <Text style={styles.sectionTitle}>Peak Hours</Text>
        </View>

        {peakHours.length > 0 ? (
          <View style={styles.tagContainer}>
            {peakHours.map((hour, index) => (
              <View
                key={hour}
                style={[
                  styles.tag,
                  { backgroundColor: index === 0 ? COLORS.accent || COLORS.primary : COLORS.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: index === 0 ? COLORS.textInverse : COLORS.text },
                  ]}
                >
                  {hour}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Not enough data yet</Text>
        )}

        <Text style={styles.hint}>
          Most user engagement happens during these times
        </Text>
      </View>

      {/* Recommendations */}
      {(peakDays.length > 0 || peakHours.length > 0) && (
        <View style={styles.recommendations}>
          <Text style={styles.recommendationsIcon}>💡</Text>
          <View style={styles.recommendationsContent}>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            <Text style={styles.recommendationsText}>
              {peakDays.length > 0 &&
                `Schedule new offers for ${peakDays[0]} to maximize engagement. `}
              {peakHours.length > 0 &&
                `Send notifications around ${peakHours[0]} for best results.`}
            </Text>
          </View>
        </View>
      )}
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  tag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  recommendations: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: `${COLORS.accent || COLORS.primary}20`,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent || COLORS.primary,
  },
  recommendationsIcon: {
    fontSize: 24,
  },
  recommendationsContent: {
    flex: 1,
  },
  recommendationsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recommendationsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
});
