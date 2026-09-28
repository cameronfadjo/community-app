import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIcon, DayHeading, EventCard, FilterPill } from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { EVERYTHING_ID, useActivityLookup } from '../../src/hooks/useActivityLookup';
import { EventWithDistance } from '../../src/services/api/events';
import { capitalize, eventsInWindow, groupByDay } from '../../src/utils/events';
import {
  DAYS_PER_MONTH_AHEAD,
  EventFilters,
  WHEN_OPTIONS,
  WhenOption,
  chooseWhen,
  coversSeveralDays,
  getTodayLabel,
  getWhenWindow,
  matchesEventFilters,
} from '../../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../src/constants/theme';

// A list that covers several days has a heading above each day's events
type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'event'; key: string; event: EventWithDistance };

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
  if (when === 'weekend') return 'this weekend';
  return when === 'week' ? 'this week' : 'this month';
};

export default function ActivityScreen() {
  const router = useRouter();
  const { id, when: askedWhen } = useLocalSearchParams<{ id: string; when?: string }>();
  const activityId = id ?? EVERYTHING_ID;

  const { forActivity, forEvent } = useActivityLookup();
  const { upcomingEvents, homeScope, loadedDays, loaded, error, loadTonight, lookAhead } =
    useEventStore();

  // Until a choice is made, follows the link that led here, or else what
  // the home screen is showing
  const [chosenWhen, setWhen] = useState<WhenOption | null>(null);
  const when: WhenOption = chosenWhen ?? chooseWhen(askedWhen, homeScope);
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

  // The month is loaded only when someone asks to see it
  const needsMonth = when === 'month';
  useEffect(() => {
    if (needsMonth) {
      lookAhead(DAYS_PER_MONTH_AHEAD);
    } else if (!loaded) {
      loadTonight();
    }
  }, [needsMonth, loaded, loadTonight, lookAhead]);

  const events: EventWithDistance[] = useMemo(() => {
    const activityFilter: EventFilters = activityId === EVERYTHING_ID ? {} : { activityId };
    return eventsInWindow(upcomingEvents, getWhenWindow(when, new Date(nowMs))).filter((event) =>
      matchesEventFilters(event, activityFilter)
    );
  }, [activityId, when, upcomingEvents, nowMs]);

  const loading = !loaded;
  // Shows what is in hand while the rest of the month loads
  const lookingFurther = needsMonth && loaded && !error && loadedDays < DAYS_PER_MONTH_AHEAD;

  const visibleEvents = useMemo(() => {
    const filters: EventFilters = { ...toggles, admitsAge: adultsOnly18 ? 18 : undefined };
    return events.filter((event) => matchesEventFilters(event, filters));
  }, [events, toggles, adultsOnly18]);

  const rows: Row[] = useMemo(() => {
    if (!coversSeveralDays(when)) {
      return visibleEvents.map((event) => ({ kind: 'event', key: event.id, event }));
    }
    return groupByDay(visibleEvents, nowMs).flatMap((day): Row[] => [
      { kind: 'day', key: day.dayKey, label: day.label },
      ...day.events.map((event): Row => ({ kind: 'event', key: event.id, event })),
    ]);
  }, [when, visibleEvents, nowMs]);

  const hasFilters = adultsOnly18 || Object.values(toggles).some(Boolean);

  const clearFilters = () => {
    setToggles({ goodForSolo: false, alcoholFree: false, freeEntry: false, stepFreeEntry: false });
    setAdultsOnly18(false);
  };

  const summary = loading ? 'Looking...' : `${visibleEvents.length} ${getWhenLabel(when, new Date(nowMs))}, soonest first`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(row) => row.key}
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
        renderItem={({ item, index }) => {
          if (item.kind === 'day') {
            return (
              <View style={index > 0 && styles.nextDay}>
                <DayHeading label={item.label} />
              </View>
            );
          }

          const look = forEvent(item.event, activityId);
          return (
            <View style={styles.card}>
              <EventCard
                event={item.event}
                nowMs={nowMs}
                color={look.color}
                icon={look.icon}
                dayShown={coversSeveralDays(when)}
                onPress={() => router.push(`/event/${item.event.id}`)}
              />
            </View>
          );
        }}
        ListFooterComponent={
          lookingFurther && rows.length > 0 ? (
            <Text style={styles.further}>Looking further ahead...</Text>
          ) : null
        }
        ListEmptyComponent={
          loading || lookingFurther ? (
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
  card: {
    marginBottom: 12,
  },
  nextDay: {
    marginTop: 12,
  },
  further: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
