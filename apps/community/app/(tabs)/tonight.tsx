import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityTile, EventRow, PrimaryButton } from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { EVERYTHING_ID, useActivityLookup } from '../../src/hooks/useActivityLookup';
import { getCurrentLocation } from '../../src/utils/location';
import { formatDayPart, getTimingFor } from '../../src/utils/events';
import { Activity, countEventsByActivity } from '../../src/types';
import { COLORS, FONTS } from '../../src/constants/theme';

const COLUMNS = 3;
// Tiles shown before "All activities" is opened, leaving one slot for Everything
const COLLAPSED_ACTIVITY_COUNT = 8;
const STARTING_SOON_COUNT = 4;

interface Tile {
  id: string;
  count: number;
}

const chunk = <T,>(items: T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

export default function TonightScreen() {
  const router = useRouter();
  const { forActivity, forEvent } = useActivityLookup();
  const {
    activities,
    tonightEvents,
    userLocation,
    loading,
    loaded,
    error,
    usingSampleData,
    setUserLocation,
    loadTonight,
  } = useEventStore();

  const [showAll, setShowAll] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    loadTonight();
  }, [loadTonight]);

  // Keep "In 18 min" labels fresh
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUseLocation = useCallback(async () => {
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
    }
  }, [setUserLocation]);

  const counts = useMemo(() => countEventsByActivity(tonightEvents), [tonightEvents]);

  // Activities with something on come first, busiest at the top
  const rankedActivities = useMemo(
    () =>
      [...activities].sort((a: Activity, b: Activity) => {
        const difference = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
        return difference !== 0 ? difference : a.sortOrder - b.sortOrder;
      }),
    [activities, counts]
  );

  const tiles: Tile[] = useMemo(() => {
    const visible = showAll ? rankedActivities : rankedActivities.slice(0, COLLAPSED_ACTIVITY_COUNT);
    return [
      ...visible.map((activity) => ({ id: activity.id, count: counts[activity.id] ?? 0 })),
      { id: EVERYTHING_ID, count: tonightEvents.length },
    ];
  }, [showAll, rankedActivities, counts, tonightEvents.length]);

  const startingSoon = useMemo(
    () =>
      tonightEvents
        .filter((event) => getTimingFor(event, nowMs).state !== 'ended')
        .slice(0, STARTING_SOON_COUNT),
    [tonightEvents, nowMs]
  );

  if (!loaded) {
    return <LoadingSpinner fullScreen message="Finding what's on..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTonight} tintColor={COLORS.primary} />
        }
      >
        <View>
          <View style={styles.header}>
            <Text style={styles.dayPart}>{formatDayPart(new Date(nowMs))}</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseLocation}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.info} />
              <Text style={styles.locationText}>{userLocation ? 'Near you' : 'Use my location'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heading}>What are you{'\n'}up for?</Text>
        </View>

        {usingSampleData && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Showing sample events. No real events are posted yet.</Text>
          </View>
        )}

        {error && (
          <View style={[styles.notice, styles.noticeError]}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        )}

        <View style={styles.grid}>
          {chunk(tiles, COLUMNS).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tile) => {
                const appearance = forActivity(tile.id);
                return (
                  <ActivityTile
                    key={tile.id}
                    label={appearance.label}
                    icon={appearance.icon}
                    color={appearance.color}
                    count={tile.count}
                    onPress={() => router.push(`/activity/${tile.id}`)}
                  />
                );
              })}
              {/* Keep tiles the same width on a short last row */}
              {Array.from({ length: COLUMNS - row.length }).map((_, index) => (
                <View key={`spacer-${index}`} style={styles.gridSpacer} />
              ))}
            </View>
          ))}
        </View>

        {activities.length > COLLAPSED_ACTIVITY_COUNT && (
          <TouchableOpacity
            style={styles.showAll}
            onPress={() => setShowAll((value) => !value)}
            accessibilityRole="button"
          >
            <Text style={styles.showAllText}>
              {showAll ? 'Show fewer' : `All ${activities.length} activities`}
            </Text>
            <MaterialCommunityIcons
              name={showAll ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.primaryDark}
            />
          </TouchableOpacity>
        )}

        <PrimaryButton
          title="Just pick for me"
          icon="shimmer"
          onPress={() => router.push('/pick')}
          disabled={tonightEvents.length === 0}
        />

        <View>
          <Text style={styles.sectionTitle}>
            {userLocation ? 'Starting soon near you' : 'Starting soon'}
          </Text>

          {startingSoon.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing on tonight yet</Text>
              <Text style={styles.emptyText}>Check back later, or look at the weekend.</Text>
            </View>
          ) : (
            <View style={styles.rows}>
              {startingSoon.map((event) => {
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
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dayPart: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  notice: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
  },
  noticeError: {
    backgroundColor: COLORS.errorLight,
  },
  noticeText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridSpacer: {
    flex: 1,
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    marginTop: -8,
  },
  showAllText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primaryDark,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 12,
  },
  rows: {
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
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
