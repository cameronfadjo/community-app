import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Venue } from '../types';
import { getCategoryInfo } from '../constants/categories';
import { COLORS, FONT_SIZES, SHADOWS } from '../constants/theme';

interface MapMarkerProps {
  venue: Venue;
  onPress: () => void;
  isSelected?: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  venue,
  onPress,
  isSelected = false,
}) => {
  const categoryInfo = getCategoryInfo(venue.category);

  return (
    <Marker
      coordinate={{
        latitude: venue.location.coordinates.latitude,
        longitude: venue.location.coordinates.longitude,
      }}
      onPress={onPress}
      tracksViewChanges={false} // Performance optimization
    >
      <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
        <Text style={styles.markerIcon}>{categoryInfo?.icon || '📍'}</Text>
        {venue.featured && (
          <View style={styles.featuredDot} />
        )}
      </View>
      {isSelected && (
        <View style={styles.callout}>
          <Text style={styles.calloutText} numberOfLines={1}>
            {venue.name}
          </Text>
        </View>
      )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  markerSelected: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary,
  },
  markerIcon: {
    fontSize: 24,
  },
  featuredDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.featured,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  callout: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    maxWidth: 150,
    ...SHADOWS.sm,
  },
  calloutText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});
