import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BusyLevel } from '../../types';
import { COLORS, FONTS } from '../../constants/theme';

export const BUSY_LABELS: Record<BusyLevel, string> = {
  quiet: 'Quiet for now',
  filling_up: 'Filling up',
  packed: 'Packed',
};

const FILLED_BARS: Record<BusyLevel, number> = {
  quiet: 1,
  filling_up: 2,
  packed: 3,
};

const BAR_HEIGHTS = [6, 9, 12];
const EMPTY_BAR_COLOR = '#D9D5CB';

interface BusyIndicatorProps {
  level: BusyLevel;
  /** Bar size multiplier */
  scale?: number;
  showLabel?: boolean;
}

export const BusyIndicator: React.FC<BusyIndicatorProps> = ({ level, scale = 1, showLabel = true }) => (
  <View style={styles.container} accessibilityLabel={BUSY_LABELS[level]}>
    <View style={styles.bars}>
      {BAR_HEIGHTS.map((height, index) => (
        <View
          key={height}
          style={{
            width: 3 * scale,
            height: height * scale,
            borderRadius: scale,
            backgroundColor: index < FILLED_BARS[level] ? COLORS.secondary : EMPTY_BAR_COLOR,
          }}
        />
      ))}
    </View>
    {showLabel && (
      <Text style={[styles.label, level === 'quiet' && styles.labelQuiet]}>{BUSY_LABELS[level]}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.secondary,
  },
  labelQuiet: {
    color: '#4A4A60',
  },
});
