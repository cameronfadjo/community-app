import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityColor, formatDistanceLabel } from '../../types';
import { EventWithDistance } from '../../services/api/events';
import { formatTimingLabel } from '../../utils/events';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../constants/theme';
import { ActivityIcon } from './ActivityIcon';
import { BusyIndicator } from './BusyIndicator';

interface EventRowProps {
  event: EventWithDistance;
  nowMs: number;
  color: ActivityColor;
  icon: string;
  onPress: () => void;
}

/** Compact event listing for the home screen */
export const EventRow: React.FC<EventRowProps> = ({ event, nowMs, color, icon, onPress }) => {
  const palette = ACTIVITY_PALETTE[color];
  const image = event.images[0];

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailEmpty, { backgroundColor: palette.tint }]}>
          <ActivityIcon icon={icon} color={palette.shade} size={28} />
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.timing} numberOfLines={1}>
          {formatTimingLabel(event, nowMs)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {event.venueName}
          {event.distanceKm !== undefined && ` · ${formatDistanceLabel(event.distanceKm)}`}
        </Text>
        {event.busyLevel && <BusyIndicator level={event.busyLevel} />}
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 18,
  },
  thumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  timing: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  meta: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
