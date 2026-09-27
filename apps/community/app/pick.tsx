import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIcon, BUSY_LABELS, PrimaryButton } from '../src/components/events';
import { LoadingSpinner } from '../src/components';
import { useEventStore } from '../src/store/eventStore';
import { useActivityLookup } from '../src/hooks/useActivityLookup';
import { EventWithDistance } from '../src/services/api/events';
import { openDirections } from '../src/utils/location';
import { formatClock, formatCover, formatTimingBadge } from '../src/utils/events';
import { formatDistanceLabel, rankEventsForPick } from '../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../src/constants/theme';

const MAX_REASONS = 4;

/** Why this event was chosen, in plain words */
const getReasons = (event: EventWithDistance): string[] => {
  const reasons: string[] = [];
  if (event.distanceKm !== undefined) {
    reasons.push(`${formatDistanceLabel(event.distanceKm)} from you`);
  }
  if (event.busyLevel && event.busyLevel !== 'quiet') {
    reasons.push(`${BUSY_LABELS[event.busyLevel]} right now`);
  }
  if (event.tags.goodForSolo) reasons.push('Good for going solo');
  if (event.perkLabel) reasons.push(`${event.perkLabel} when you arrive`);
  if (event.tags.firstTimersWelcome) reasons.push('First-timers welcome');
  if (event.coverCents === 0) reasons.push('Free entry');
  return reasons.slice(0, MAX_REASONS);
};

export default function PickScreen() {
  const router = useRouter();
  const { forEvent } = useActivityLookup();
  const { homeEvents, loaded, loadTonight } = useEventStore();

  const [position, setPosition] = useState(0);
  const [nowMs] = useState(Date.now());

  useEffect(() => {
    if (!loaded) {
      loadTonight();
    }
  }, [loaded, loadTonight]);

  const ranked = useMemo(
    () =>
      rankEventsForPick(
        homeEvents.map((event) => ({
          ...event,
          startsAtMs: event.startsAt.toMillis(),
          endsAtMs: event.endsAt.toMillis(),
        })),
        nowMs
      ),
    [homeEvents, nowMs]
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  if (!loaded) {
    return <LoadingSpinner fullScreen message="Picking something good..." />;
  }

  const event = ranked.length > 0 ? ranked[position % ranked.length] : undefined;

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.empty]}>
        <Text style={styles.heading}>Nothing to pick from yet</Text>
        <Text style={styles.emptyText}>There's nothing on near you this week. Check back soon.</Text>
        <PrimaryButton title="Back" onPress={close} variant="secondary" />
      </SafeAreaView>
    );
  }

  const appearance = forEvent(event);
  const palette = ACTIVITY_PALETTE[appearance.color];
  const image = event.images[0];

  const handleDirections = () => {
    const { latitude, longitude } = event.location.coordinates;
    openDirections(latitude, longitude, event.venueName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Picked for you</Text>
          <Text style={styles.heading}>Go to this one</Text>
        </View>
        <TouchableOpacity
          style={styles.close}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => router.push(`/event/${event.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${event.title}, see details`}
        >
          <View style={[styles.photo, { backgroundColor: palette.tint }]}>
            {image ? (
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <ActivityIcon icon={appearance.icon} color={palette.shade} size={56} />
            )}
            <View style={[styles.badge, styles.badgeLeft]}>
              <Text style={styles.badgeText}>{formatTimingBadge(event, nowMs)}</Text>
            </View>
            <View style={[styles.badge, styles.badgeRight]}>
              <ActivityIcon icon={appearance.icon} color={palette.shade} size={14} />
              <Text style={[styles.badgeText, { color: palette.shade }]}>{appearance.label}</Text>
            </View>
          </View>

          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={styles.meta}>
              at {event.venueName} · {formatClock(event.startsAtMs)} · {formatCover(event.coverCents)}
            </Text>

            <View style={styles.reasons}>
              {getReasons(event).map((reason) => (
                <View key={reason} style={styles.reason}>
                  <MaterialCommunityIcons name="check-bold" size={16} color={COLORS.secondary} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        <PrimaryButton title="Take me there" icon="navigation-variant-outline" onPress={handleDirections} />
        {ranked.length > 1 && (
          <PrimaryButton
            title="Show me another"
            icon="refresh"
            variant="secondary"
            onPress={() => setPosition((value) => value + 1)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  empty: {
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photo: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  badgeLeft: {
    left: 14,
  },
  badgeRight: {
    right: 14,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  details: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: COLORS.text,
    marginBottom: 4,
  },
  meta: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  reasons: {
    gap: 10,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reasonText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.text,
  },
});
