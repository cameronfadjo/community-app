import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventRow, PrimaryButton } from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { useActivityLookup } from '../../src/hooks/useActivityLookup';
import { getCurrentLocation } from '../../src/utils/location';
import { capitalize, formatPeriod, getTimingFor } from '../../src/utils/events';
import { COLORS, FONTS } from '../../src/constants/theme';

/**
 * Nearest-first list of what's on. The interactive map needs native
 * map setup, which isn't done yet, so this tab lists by distance for now.
 */
export default function MapScreen() {
  const router = useRouter();
  const { forEvent } = useActivityLookup();
  const { homeEvents, homeScope, userLocation, loaded, loadTonight, setUserLocation } =
    useEventStore();
  const [nowMs] = useState(Date.now());

  useEffect(() => {
    if (!loaded) {
      loadTonight();
    }
  }, [loaded, loadTonight]);

  const nearestFirst = useMemo(
    () =>
      homeEvents
        .filter((event) => getTimingFor(event, nowMs).state !== 'ended')
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)),
    [homeEvents, nowMs]
  );

  const handleUseLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
    }
  };

  const period = formatPeriod(homeScope, new Date(nowMs));

  if (!loaded) {
    return <LoadingSpinner fullScreen message="Finding what's near you..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.heading}>Near you</Text>
          <Text style={styles.subheading}>
            {userLocation ? `On ${period}, nearest first` : `On ${period}`}
          </Text>
        </View>

        {!userLocation && (
          <View style={styles.prompt}>
            <Text style={styles.promptText}>
              Turn on location to see how far each event is and sort by distance.
            </Text>
            <PrimaryButton title="Use my location" icon="map-marker-outline" onPress={handleUseLocation} />
          </View>
        )}

        {nearestFirst.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{`Nothing on ${period} yet`}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {nearestFirst.map((event) => {
              const appearance = forEvent(event);
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  nowMs={nowMs}
                  color={appearance.color}
                  icon={appearance.icon}
                  onPress={() => router.push(`/event/${event.id}`)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  subheading: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  prompt: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    gap: 14,
  },
  promptText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  list: {
    gap: 10,
  },
  empty: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
});
