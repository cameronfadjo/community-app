import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Venue } from '../types';

interface VenueMapProps {
  venues: (Venue & { distance?: number })[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedVenueId?: string | null;
  onVenuePress: (venue: Venue) => void;
  onRegionChange?: (region: any) => void;
}

/**
 * Web version of VenueMap
 * Uses a simple placeholder for now - can be upgraded to use Google Maps JS API or Mapbox
 */
export const VenueMap: React.FC<VenueMapProps> = ({
  venues,
  userLocation,
  selectedVenueId,
  onVenuePress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📍 Map View</Text>
        <Text style={styles.infoText}>
          {venues.length} venues nearby
        </Text>
        <Text style={styles.noteText}>
          (Interactive map available on mobile)
        </Text>
      </View>
      <View style={styles.venueList}>
        {venues.slice(0, 5).map((venue) => (
          <View
            key={venue.id}
            style={[
              styles.venueItem,
              venue.id === selectedVenueId && styles.selectedVenue,
            ]}
            onClick={() => onVenuePress(venue)}
          >
            <Text style={styles.venueName}>{venue.name}</Text>
            {venue.distance && (
              <Text style={styles.venueDistance}>
                {venue.distance.toFixed(1)} mi
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    margin: 16,
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  venueList: {
    padding: 16,
  },
  venueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    cursor: 'pointer',
  },
  selectedVenue: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  venueName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  venueDistance: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
