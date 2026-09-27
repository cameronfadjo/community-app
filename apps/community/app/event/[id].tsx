import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIcon,
  BUSY_LABELS,
  BusyIndicator,
  PerkCard,
  PrimaryButton,
  getTagLabels,
} from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { useActivityLookup } from '../../src/hooks/useActivityLookup';
import { EventWithDistance } from '../../src/services/api/events';
import { openDirections } from '../../src/utils/location';
import { formatClock, formatCover, formatTimingBadge, getTimingFor } from '../../src/utils/events';
import { formatDistanceLabel, getTodayLabel } from '../../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../src/constants/theme';

const BUSY_HEADLINES = {
  quiet: 'Quiet right now',
  filling_up: 'Filling up right now',
  packed: 'Packed right now',
};

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { forActivity, forEvent } = useActivityLookup();
  const { findEvent, tonightEvents, loaded, loadTonight } = useEventStore();

  const [event, setEvent] = useState<EventWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs] = useState(Date.now());

  useEffect(() => {
    if (!loaded) {
      loadTonight();
    }
  }, [loaded, loadTonight]);

  useEffect(() => {
    if (!id || !loaded) {
      return;
    }

    let cancelled = false;
    findEvent(id)
      .then((found) => {
        if (!cancelled) setEvent(found);
      })
      .catch((e) => console.error('[Event] Error loading event:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, loaded, findEvent]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading event..." />;
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.missing]}>
        <Text style={styles.missingTitle}>We couldn't find that event</Text>
        <Text style={styles.missingText}>It may have been cancelled or already happened.</Text>
        <PrimaryButton title="See what's on" onPress={() => router.replace('/(tabs)/whats-on')} />
      </SafeAreaView>
    );
  }

  const appearance = forEvent(event);
  const palette = ACTIVITY_PALETTE[appearance.color];
  const timing = getTimingFor(event, nowMs);
  const image = event.images[0];
  const tagLabels = getTagLabels(event.tags, event.audience);

  const facts = [
    event.tags.minimumAge > 0 ? `${event.tags.minimumAge}+` : 'All ages',
    event.organizerName ? `Hosted by ${event.organizerName}` : null,
  ].filter((fact): fact is string => Boolean(fact));

  // Other things at the same venue before the night ends
  const alsoHere = tonightEvents.filter(
    (other) =>
      other.id !== event.id &&
      other.venueId === event.venueId &&
      getTimingFor(other, nowMs).state !== 'ended'
  );

  const handleDirections = () => {
    const { latitude, longitude } = event.location.coordinates;
    openDirections(latitude, longitude, event.venueName);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: event.title,
        message: `${event.title} at ${event.venueName}, ${formatClock(event.startsAt.toMillis())}`,
      });
    } catch (e) {
      console.error('[Event] Error sharing:', e);
    }
  };

  const leaveHint =
    timing.state === 'on_now'
      ? 'on now'
      : timing.state === 'starting_soon'
        ? 'leave now to catch the start'
        : `starts ${formatClock(event.startsAt.toMillis())}`;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.photo, { backgroundColor: palette.tint }]}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <ActivityIcon icon={appearance.icon} color={palette.shade} size={64} />
          )}

          <SafeAreaView edges={['top']} style={styles.photoActions}>
            <TouchableOpacity
              style={styles.roundButton}
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <MaterialCommunityIcons name="export-variant" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.activityBadge}>
            <ActivityIcon icon={appearance.icon} color={palette.shade} size={14} />
            <Text style={[styles.activityBadgeText, { color: palette.shade }]}>{appearance.label}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View>
            <Text style={styles.timing}>{formatTimingBadge(event, nowMs)}</Text>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.venue}>at {event.venueName}</Text>
            {event.status === 'cancelled' && (
              <View style={styles.cancelled}>
                <Text style={styles.cancelledText}>This event has been cancelled</Text>
              </View>
            )}
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{timing.state === 'on_now' ? 'Ends' : 'Starts'}</Text>
              <Text style={styles.statValue}>
                {formatClock(
                  timing.state === 'on_now' ? event.endsAt.toMillis() : event.startsAt.toMillis()
                )}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Cover</Text>
              <Text style={styles.statValue}>
                {event.coverCents > 0 ? formatCover(event.coverCents).replace(' cover', '') : 'Free'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>From you</Text>
              <Text style={styles.statValue}>
                {event.distanceKm !== undefined ? formatDistanceLabel(event.distanceKm) : '—'}
              </Text>
            </View>
          </View>

          {event.busyLevel && (
            <View style={styles.busy} accessibilityLabel={BUSY_LABELS[event.busyLevel]}>
              <BusyIndicator level={event.busyLevel} scale={2.4} showLabel={false} />
              <View style={styles.busyText}>
                <Text style={styles.cardTitle}>{BUSY_HEADLINES[event.busyLevel]}</Text>
                <Text style={styles.busyNote}>Based on anonymous arrivals.</Text>
              </View>
            </View>
          )}

          <View>
            <Text style={styles.sectionTitle}>What to expect</Text>
            <Text style={styles.description}>{event.description}</Text>
            {tagLabels.length > 0 && (
              <View style={styles.chips}>
                {tagLabels.map((label) => (
                  <View key={label} style={styles.checkChip}>
                    <MaterialCommunityIcons name="check-bold" size={14} color={COLORS.info} />
                    <Text style={styles.chipText}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <PerkCard event={event} />

          {alsoHere.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>{`Also here ${getTodayLabel(new Date(nowMs))}`}</Text>
              <View style={styles.alsoList}>
                {alsoHere.map((other) => {
                  const look = forActivity(other.activityIds[0] ?? '');
                  const otherPalette = ACTIVITY_PALETTE[look.color];
                  return (
                    <TouchableOpacity
                      key={other.id}
                      style={styles.alsoRow}
                      onPress={() => router.push(`/event/${other.id}`)}
                      accessibilityRole="button"
                    >
                      <View style={[styles.alsoIcon, { backgroundColor: otherPalette.tint }]}>
                        <ActivityIcon icon={look.icon} color={otherPalette.shade} size={22} />
                      </View>
                      <View style={styles.busyText}>
                        <Text style={styles.alsoTitle}>{other.title}</Text>
                        <Text style={styles.alsoMeta}>{formatTimingBadge(other, nowMs)}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.chips}>
            {facts.map((fact) => (
              <View key={fact} style={styles.factChip}>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <PrimaryButton
          title="Take me there"
          icon="navigation-variant-outline"
          onPress={handleDirections}
          disabled={event.status === 'cancelled'}
        />
        <Text style={styles.footerNote} numberOfLines={1}>
          {event.location.address} · {leaveHint}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  missing: {
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  missingTitle: {
    fontFamily: FONTS.black,
    fontSize: 24,
    color: COLORS.text,
  },
  missingText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  photo: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  photoActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBadge: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  activityBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  timing: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: COLORS.text,
    marginBottom: 6,
  },
  venue: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  cancelled: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.errorLight,
  },
  cancelledText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.error,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryLight,
  },
  busyText: {
    flex: 1,
  },
  busyNote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#35503C',
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#3A3A50',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  factChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceVariant,
  },
  factText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#3A3A50',
  },
  alsoList: {
    gap: 10,
  },
  alsoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alsoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alsoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  alsoMeta: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerNote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
