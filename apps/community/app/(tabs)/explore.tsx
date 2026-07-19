import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VenueCard, VenueMap, FilterBar, LoadingSpinner, LocationPermissionPrompt } from '../../src/components';
import { useVenueStore } from '../../src/store/venueStore';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { getCurrentLocation } from '../../src/utils/location';
import { getOfferCountsForVenues } from '../../src/services/api/venueOffers';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../../src/constants/theme';

export default function ExploreScreen() {
  const router = useRouter();

  const {
    venues,
    filteredVenues,
    selectedVenueId,
    loading,
    userLocation,
    selectedCategories,
    selectedPriceRanges,
    setUserLocation,
    fetchNearbyVenues,
    selectVenue,
    toggleCategory,
    togglePriceRange,
    clearFilters,
    useSampleData,
  } = useVenueStore();

  const { toggleFavorite, isFavorite, loadFavorites } = useFavoritesStore();

  // Default to list view on iOS/Android since maps need native setup
  const [viewMode, setViewMode] = useState<'map' | 'list'>(
    Platform.OS === 'web' ? 'map' : 'list'
  );
  const [initialLoad, setInitialLoad] = useState(true);
  const [offerCounts, setOfferCounts] = useState<Map<string, number>>(new Map());
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  useEffect(() => {
    loadLocation();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (venues.length > 0) {
      loadOfferCounts();
    }
  }, [venues]);

  const loadLocation = async () => {
    setRequestingLocation(true);
    console.log('[Explore] Requesting location...');

    const location = await getCurrentLocation();
    console.log('[Explore] Location result:', location);

    if (location) {
      setUserLocation(location);
      setLocationPermissionDenied(false);
      console.log('[Explore] Fetching nearby venues...');
      // Fetch real data from Firestore
      await fetchNearbyVenues(location.latitude, location.longitude);
      console.log('[Explore] Venues loaded');
    } else {
      console.log('[Explore] Location denied, showing permission prompt');
      // Show permission prompt instead of alert
      setLocationPermissionDenied(true);
    }

    setInitialLoad(false);
    setRequestingLocation(false);
  };

  const handleRequestLocation = async () => {
    console.log('[Explore] User clicked Enable Location');
    await loadLocation();
  };

  const handleSkipLocation = () => {
    console.log('[Explore] User skipped location');
    setLocationPermissionDenied(false);
    // Load sample data for browsing
    useSampleData();
  };

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}`);
  };

  const handleMarkerPress = (venueId: string) => {
    selectVenue(venueId);
  };

  const loadOfferCounts = async () => {
    const venueIds = venues.map(v => v.id);
    const counts = await getOfferCountsForVenues(venueIds);
    setOfferCounts(counts);
  };

  const toggleOffersFilter = () => {
    setShowOffersOnly(!showOffersOnly);
  };

  let displayVenues = filteredVenues.length > 0 ? filteredVenues : venues;

  // Apply offers-only filter
  if (showOffersOnly) {
    displayVenues = displayVenues.filter(venue => (offerCounts.get(venue.id) || 0) > 0);
  }

  if (initialLoad) {
    return <LoadingSpinner fullScreen message="Finding nearby venues..." />;
  }

  if (locationPermissionDenied) {
    return (
      <LocationPermissionPrompt
        onRequestPermission={handleRequestLocation}
        onSkip={handleSkipLocation}
        loading={requestingLocation}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <FilterBar
        selectedCategories={selectedCategories}
        selectedPriceRanges={selectedPriceRanges}
        showOffersOnly={showOffersOnly}
        onCategoryToggle={toggleCategory}
        onPriceRangeToggle={togglePriceRange}
        onToggleOffersOnly={toggleOffersFilter}
        onClearAll={() => {
          clearFilters();
          setShowOffersOnly(false);
        }}
      />

      {/* Map/List Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          onPress={() => setViewMode('map')}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'map' && styles.toggleButtonTextActive,
            ]}
          >
            🗺️ Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'list' && styles.toggleButtonTextActive,
            ]}
          >
            📋 List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {displayVenues.length} {displayVenues.length === 1 ? 'venue' : 'venues'} nearby
        </Text>
        {userLocation && (
          <Text style={styles.locationText}>
            📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Content */}
      {viewMode === 'map' ? (
        <VenueMap
          venues={displayVenues}
          userLocation={userLocation}
          selectedVenueId={selectedVenueId}
          onVenuePress={(venue) => handleMarkerPress(venue.id)}
        />
      ) : (
        <FlatList
          data={displayVenues}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              onPress={() => handleVenuePress(item.id)}
              onFavorite={() => toggleFavorite(item.id, item)}
              isFavorite={isFavorite(item.id)}
              offerCount={offerCounts.get(item.id) || 0}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No venues found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your filters or search radius
              </Text>
            </View>
          }
        />
      )}

      {/* Selected Venue Preview (when in map mode) */}
      {viewMode === 'map' && selectedVenueId && (
        <View style={styles.previewContainer}>
          {displayVenues
            .filter((v) => v.id === selectedVenueId)
            .map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onPress={() => handleVenuePress(venue.id)}
                onFavorite={() => toggleFavorite(venue.id, venue)}
                isFavorite={isFavorite(venue.id)}
                offerCount={offerCounts.get(venue.id) || 0}
              />
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  toggleButtonTextActive: {
    color: COLORS.textInverse,
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SPACING.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
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
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  previewContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    ...SHADOWS.lg,
  },
});
