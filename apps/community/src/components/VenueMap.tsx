import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { Venue } from '../types';

// Conditionally import react-native-maps only on web
// iOS requires native setup which we'll do later
let MapView: any;
let PROVIDER_GOOGLE: any;
let Region: any;
let MapMarker: any;

if (Platform.OS === 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
    Region = maps.Region;
  } catch (e) {
    console.log('react-native-maps not available on web');
  }
  const markerModule = require('./MapMarker');
  MapMarker = markerModule.MapMarker;
}

interface VenueMapProps {
  venues: (Venue & { distance?: number })[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedVenueId?: string | null;
  onVenuePress: (venue: Venue) => void;
  onRegionChange?: (region: Region) => void;
}

export const VenueMap: React.FC<VenueMapProps> = ({
  venues,
  userLocation,
  selectedVenueId,
  onVenuePress,
  onRegionChange,
}) => {
  const mapRef = useRef<any>(null);

  // iOS fallback - maps require native setup
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackText}>
          📍 Map view requires iOS native setup
        </Text>
        <Text style={styles.fallbackSubtext}>
          {venues.length} venue{venues.length !== 1 ? 's' : ''} available in list view
        </Text>
      </View>
    );
  }

  // Android fallback - not implemented yet
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackText}>
          📍 Map view coming soon for Android
        </Text>
        <Text style={styles.fallbackSubtext}>
          {venues.length} venue{venues.length !== 1 ? 's' : ''} available in list view
        </Text>
      </View>
    );
  }

  // Web map rendering
  if (!MapView) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackText}>Map not available</Text>
      </View>
    );
  }

  // Center map on user location when available
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    }
  }, [userLocation]);

  // Center map on selected venue
  useEffect(() => {
    if (selectedVenueId && mapRef.current) {
      const selectedVenue = venues.find((v) => v.id === selectedVenueId);
      if (selectedVenue) {
        mapRef.current.animateToRegion(
          {
            latitude: selectedVenue.location.coordinates.latitude,
            longitude: selectedVenue.location.coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    }
  }, [selectedVenueId, venues]);

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        // Default to San Francisco if no location
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        onRegionChangeComplete={onRegionChange}
        mapType="standard"
      >
        {venues.map((venue) => (
          <MapMarker
            key={venue.id}
            venue={venue}
            onPress={() => onVenuePress(venue)}
            isSelected={venue.id === selectedVenueId}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
