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
import {
  AccountButton,
  ActivityTile,
  DayHeading,
  EventRow,
  PeriodSwitch,
  PrimaryButton,
} from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { EVERYTHING_ID, useActivityLookup } from '../../src/hooks/useActivityLookup';
import { getCurrentLocation } from '../../src/utils/location';
import {
  capitalize,
  formatDayPart,
  formatPeriod,
  getTimingFor,
  groupByDay,
} from '../../src/utils/events';
import {
  Activity,
  DAYS_PER_MONTH_AHEAD,
  chooseWhen,
  countEventsByActivity,
} from '../../src/types';
import { COLORS, FONTS } from '../../src/constants/theme';

const COLUMNS = 3;
// Tiles shown before "All activities" is opened, leaving one slot for Everything
const COLLAPSED_ACTIVITY_COUNT = 8;
const STARTING_SOON_COUNT = 4;
// How much of the week or month is shown before "See all"
const COMING_UP_COUNT = 8;

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

export default function WhatsOnScreen() {
  const router = useRouter();
  const { forActivity, forEvent } = useActivityLookup();
  const {
    activities,
    homeEvents,
    homeScope,
    chosenScope,
    loadedDays,
    userLocation,
    loading,
    loaded,
    error,
    usingSampleData,
    setUserLocation,
    loadTonight,
    chooseScope,
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

  const counts = useMemo(() => countEventsByActivity(homeEvents), [homeEvents]);
  const period = formatPeriod(homeScope, new Date(nowMs));
  const today = formatPeriod('today', new Date(nowMs));

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
      { id: EVERYTHING_ID, count: homeEvents.length },
    ];
  }, [showAll, rankedActivities, counts, homeEvents.length]);

  const stillToCome = useMemo(
    () => homeEvents.filter((event) => getTimingFor(event, nowMs).state !== 'ended'),
    [homeEvents, nowMs]
  );

  // Today is a short list. The week and the month are laid out by day.
  const shown = useMemo(
    () => stillToCome.slice(0, homeScope === 'today' ? STARTING_SOON_COUNT : COMING_UP_COUNT),
    [stillToCome, homeScope]
  );
  const days = useMemo(() => groupByDay(shown, nowMs), [shown, nowMs]);

  // The week was chosen for them, because today is thin
  const choseForThem = chosenScope === null && homeScope === 'week';
  const lookingFurther = homeScope === 'month' && loading && loadedDays < DAYS_PER_MONTH_AHEAD;

  const renderRows = (events: typeof homeEvents, dayShown = false) => (
    <View style={styles.rows}>
      {events.map((event) => {
        const appearance = forEvent(event);
        return (
          <EventRow
            key={event.id}
            event={event}
            nowMs={nowMs}
            color={appearance.color}
            icon={appearance.icon}
            dayShown={dayShown}
            onPress={() => router.push(`/event/${event.id}`)}
          />
        );
      })}
    </View>
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
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadTonight({ force: true })}
            tintColor={COLORS.primary}
          />
        }
      >
        <View>
          <View style={styles.header}>
            <Text style={styles.dayPart}>{formatDayPart(new Date(nowMs))}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseLocation}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.info} />
                <Text style={styles.locationText}>{userLocation ? 'Near you' : 'Use my location'}</Text>
              </TouchableOpacity>
              <AccountButton />
            </View>
          </View>
          <Text style={styles.heading}>What are you{'\n'}up for?</Text>
        </View>

        <PeriodSwitch selected={homeScope} now={new Date(nowMs)} onChange={chooseScope} />

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
                    period={period}
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
          disabled={homeEvents.length === 0}
        />

        <View>
          <Text style={styles.sectionTitle}>
            {homeScope !== 'today'
              ? `Coming up ${period}`
              : userLocation
                ? 'Starting soon near you'
                : 'Starting soon'}
          </Text>
          {choseForThem && shown.length > 0 && (
            <Text style={styles.sectionNote}>{`It's quiet ${today}, so here's the week.`}</Text>
          )}

          {shown.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {lookingFurther ? 'Looking further ahead...' : `Nothing on ${period} yet`}
              </Text>
              {!lookingFurther && (
                <Text style={styles.emptyText}>
                  {homeScope === 'month'
                    ? 'Venues post through the week, so check back.'
                    : 'Check back later, or look further ahead.'}
                </Text>
              )}
            </View>
          ) : homeScope === 'today' ? (
            renderRows(shown)
          ) : (
            <View style={styles.days}>
              {days.map((day) => (
                <View key={day.dayKey}>
                  <DayHeading label={day.label} />
                  {renderRows(day.events, true)}
                </View>
              ))}
            </View>
          )}

          {lookingFurther && shown.length > 0 && (
            <Text style={styles.further}>Looking further ahead...</Text>
          )}

          {stillToCome.length > shown.length && (
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() =>
                router.push(`/activity/${EVERYTHING_ID}?when=${chooseWhen(null, homeScope)}`)
              }
              accessibilityRole="button"
            >
              <Text style={styles.showAllText}>{`See all ${stillToCome.length} ${period}`}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionNote: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -6,
    marginBottom: 12,
  },
  further: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  days: {
    gap: 12,
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
