import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AccountButton, ActivityIcon } from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { usePerkStore } from '../../src/store/perkStore';
import { useAuth } from '../../src/hooks/useAuth';
import { useActivityLookup } from '../../src/hooks/useActivityLookup';
import { formatClock, formatDayPart, getTimingFor } from '../../src/utils/events';
import { formatDistanceLabel, getRedemptionState, getSecondsLeft } from '../../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../src/constants/theme';

export default function PerksScreen() {
  const router = useRouter();
  const { forEvent } = useActivityLookup();
  const { weekEvents, loaded, loadTonight, usingSampleData } = useEventStore();
  const { perks, loadMine } = usePerkStore();
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadMine({ userId, sample: usingSampleData }).catch((e) =>
      console.error('[Perks] Error loading unlocked perks:', e)
    );
  }, [userId, usingSampleData, loadMine]);

  const unlocked = useMemo(
    () => Object.values(perks).filter((perk) => getRedemptionState(perk, nowMs) === 'unlocked'),
    [perks, nowMs]
  );

  useEffect(() => {
    if (!loaded) {
      loadTonight();
    }
  }, [loaded, loadTonight]);

  const withPerks = useMemo(
    () =>
      weekEvents.filter(
        (event) => event.perkLabel && getTimingFor(event, nowMs).state !== 'ended'
      ),
    [weekEvents, nowMs]
  );

  if (!loaded) {
    return <LoadingSpinner fullScreen message="Finding perks..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.dayPart}>{formatDayPart(new Date(nowMs))}</Text>
            <Text style={styles.heading}>Perks</Text>
          </View>
          <AccountButton />
        </View>

        {unlocked.map((perk) => (
          <TouchableOpacity
            key={perk.eventId}
            style={styles.unlocked}
            onPress={() => router.push(`/perk/${perk.eventId}`)}
            activeOpacity={0.9}
            accessibilityRole="button"
          >
            <View style={styles.unlockedText}>
              <Text style={styles.unlockedLabel}>Unlocked now</Text>
              <Text style={styles.unlockedTitle}>{perk.perkLabel}</Text>
              <Text style={styles.unlockedMeta}>
                {perk.venueName} · {Math.ceil(getSecondsLeft(perk.expiresAtMs, nowMs) / 60)} min left
              </Text>
            </View>
            <Text style={styles.unlockedAction}>Show</Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.explainer, unlocked.length > 0 && styles.explainerQuiet]}>
          <Text style={[styles.explainerTitle, unlocked.length > 0 && styles.explainerTextQuiet]}>
            Reasons to go out
          </Text>
          <Text style={[styles.explainerText, unlocked.length > 0 && styles.explainerTextQuiet]}>
            Each perk unlocks when you walk in. Show your screen to the bartender. There's no code to
            type and nothing to scan.
          </Text>
        </View>

        {withPerks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No perks this week yet</Text>
            <Text style={styles.emptyText}>Venues add them through the week, so check back.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {withPerks.map((event) => {
              const appearance = forEvent(event);
              const palette = ACTIVITY_PALETTE[appearance.color];
              const timing = getTimingFor(event, nowMs);
              const where = [
                appearance.label,
                event.venueName,
                event.distanceKm !== undefined ? formatDistanceLabel(event.distanceKm) : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.row}
                  onPress={() => router.push(`/event/${event.id}?from=perks`)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={[styles.icon, { backgroundColor: palette.tint }]}>
                    <ActivityIcon icon={appearance.icon} color={palette.shade} size={22} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{event.perkLabel}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {where}
                    </Text>
                  </View>
                  <Text style={styles.rowWhen}>
                    {timing.state === 'on_now'
                      ? `Until ${formatClock(event.endsAt.toMillis())}`
                      : formatClock(event.startsAt.toMillis())}
                  </Text>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayPart: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  explainer: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
  },
  explainerTitle: {
    fontFamily: FONTS.black,
    fontSize: 22,
    color: COLORS.textInverse,
    marginBottom: 6,
  },
  explainerText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textInverse,
  },
  explainerQuiet: {
    backgroundColor: COLORS.accentLight,
  },
  explainerTextQuiet: {
    color: COLORS.text,
  },
  unlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
  },
  unlockedText: {
    flex: 1,
  },
  unlockedLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textInverse,
    marginBottom: 2,
  },
  unlockedTitle: {
    fontFamily: FONTS.black,
    fontSize: 24,
    color: COLORS.textInverse,
  },
  unlockedMeta: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textInverse,
  },
  unlockedAction: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.accent,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    overflow: 'hidden',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowWhen: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
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
