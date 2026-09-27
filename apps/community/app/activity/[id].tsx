import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIcon, EventCard, FilterPill } from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { EVERYTHING_ID, useActivityLookup } from '../../src/hooks/useActivityLookup';
import { EventWithDistance } from '../../src/services/api/events';
import { capitalize, eventsInWindow } from '../../src/utils/events';
import {
  EventFilters,
  WhenOption,
  getTodayLabel,
  getWhenWindow,
  matchesEventFilters,
} from '../../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../src/constants/theme';

// 'tonight' covers the rest of today; its label follows the time of day
const WHEN_OPTIONS: WhenOption[] = ['tonight', 'tomorrow', 'weekend', 'week'];

type ToggleFilter = 'goodForSolo' | 'alcoholFree' | 'freeEntry' | 'stepFreeEntry';

const TOGGLE_FILTERS: Array<{ key: ToggleFilter; label: string }> = [
  { key: 'goodForSolo', label: 'Good for going solo' },
  { key: 'alcoholFree', label: 'Alcohol-free' },
  { key: 'freeEntry', label: 'Free entry' },
  { key: 'stepFreeEntry', label: 'Step-free' },
];

const getWhenLabel = (when: WhenOption, now: Date): string => {
  if (when === 'tonight') return getTodayLabel(now);
  if (when === 'tomorrow') return 'tomorrow';
  return when === 'weekend' ? 'this weekend' : 'this week';
};

export default function ActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = id ?? EVERYTHING_ID;

  const { forActivity, forEvent } = useActivityLookup();
  const { weekEvents, homeScope, loaded, error, loadTonight } = useEventStore();

  // Until a choice is made, follows what the home screen is showing
  const [chosenWhen, setWhen] = useState<WhenOption | null>(null);
  const when: WhenOption = chosenWhen ?? (homeScope === 'week' ? 'week' : 'tonight');
  const [toggles, setToggles] = useState<Record<ToggleFilter, boolean>>({
    goodForSolo: false,
    alcoholFree: false,
    freeEntry: false,
    stepFreeEntry: false,
  });
  const [adultsOnly18, setAdultsOnly18] = useState(false);
  const [nowMs] = useState(Date.now());

  const appearance = forActivity(activityId);
  const palette = ACTIVITY_PALETTE[appearance.color];

  useEffect(() => {
    if (!loaded) {
      loadTonight();
    }
  }, [loaded, loadTonight]);

  // The week is already loaded, and every choice falls inside it
  const events: EventWithDistance[] = useMemo(() => {
    const activityFilter: EventFilters = activityId === EVERYTHING_ID ? {} : { activityId };
    return eventsInWindow(weekEvents, getWhenWindow(when, new Date(nowMs))).filter((event) =>
      matchesEventFilters(event, activityFilter)
    );
  }, [activityId, when, weekEvents, nowMs]);

  const loading = !loaded;

  const visibleEvents = useMemo(() => {
    const filters: EventFilters = { ...toggles, admitsAge: adultsOnly18 ? 18 : undefined };
    return events.filter((event) => matchesEventFilters(event, filters));
  }, [events, toggles, adultsOnly18]);

  const hasFilters = adultsOnly18 || Object.values(toggles).some(Boolean);

  const clearFilters = () => {
    setToggles({ goodForSolo: false, alcoholFree: false, freeEntry: false, stepFreeEntry: false });
    setAdultsOnly18(false);
  };

  const summary = loading ? 'Looking...' : `${visibleEvents.length} ${getWhenLabel(when, new Date(nowMs))}, soonest first`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={loading ? [] : visibleEvents}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.back}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, { backgroundColor: palette.tint }]}>
                <ActivityIcon icon={appearance.icon} color={palette.shade} />
              </View>
              <Text style={styles.title}>{appearance.label}</Text>
            </View>
            <Text style={styles.summary}>{summary}</Text>

            <View style={styles.whenRow}>
              {WHEN_OPTIONS.map((option) => (
                <FilterPill
                  key={option}
                  label={capitalize(getWhenLabel(option, new Date(nowMs)))}
                  selected={when === option}
                  onPress={() => setWhen(option)}
                  solid
                />
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {TOGGLE_FILTERS.map((filter) => (
                <FilterPill
                  key={filter.key}
                  label={filter.label}
                  selected={toggles[filter.key]}
                  onPress={() =>
                    setToggles((current) => ({ ...current, [filter.key]: !current[filter.key] }))
                  }
                />
              ))}
              <FilterPill
                label="18+"
                selected={adultsOnly18}
                onPress={() => setAdultsOnly18((value) => !value)}
              />
            </ScrollView>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const look = forEvent(item, activityId);
          return (
            <EventCard
              event={item}
              nowMs={nowMs}
              color={look.color}
              icon={look.icon}
              onPress={() => router.push(`/event/${item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner message="Finding events..." />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {error ?? `No ${appearance.label.toLowerCase()} ${getWhenLabel(when, new Date(nowMs))}`}
              </Text>
              {!error && (
                <Text style={styles.emptyText}>
                  {hasFilters
                    ? 'Try turning off a filter.'
                    : 'Try another day, or see everything that is on.'}
                </Text>
              )}
              {hasFilters && (
                <TouchableOpacity onPress={clearFilters} style={styles.emptyAction} accessibilityRole="button">
                  <Text style={styles.emptyActionText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  back: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FONTS.black,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  summary: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  filterScroll: {
    marginTop: 10,
    marginHorizontal: -20,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 20,
  },
  separator: {
    height: 12,
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
  emptyAction: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyActionText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primaryDark,
  },
});
