import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityColor } from '../../types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../constants/theme';
import { ActivityIcon } from './ActivityIcon';

interface ActivityTileProps {
  label: string;
  icon: string;
  color: ActivityColor;
  /** Events on tonight */
  count: number;
  onPress: () => void;
}

export const ActivityTile: React.FC<ActivityTileProps> = ({ label, icon, color, count, onPress }) => {
  const palette = ACTIVITY_PALETTE[color];
  const hasEvents = count > 0;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: palette.tint }, !hasEvents && styles.tileEmpty]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${hasEvents ? `${count} tonight` : 'none tonight'}`}
    >
      <ActivityIcon icon={icon} color={palette.shade} />
      <View>
        <Text style={styles.label} numberOfLines={3}>
          {label}
        </Text>
        <Text style={styles.count}>{hasEvents ? `${count} tonight` : 'None tonight'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 108,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 24,
    justifyContent: 'space-between',
    gap: 10,
  },
  tileEmpty: {
    opacity: 0.6,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 19,
    color: COLORS.text,
  },
  count: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#4A4A60',
  },
});
