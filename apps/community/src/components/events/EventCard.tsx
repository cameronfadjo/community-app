import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityColor, EventTags, formatDistanceLabel } from '../../types';
import { EventWithDistance } from '../../services/api/events';
import { formatClock, formatCover, formatTimingBadge, getTimingFor } from '../../utils/events';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../constants/theme';
import { ActivityIcon } from './ActivityIcon';
import { BusyIndicator } from './BusyIndicator';
import { Tag } from './Pill';

/** The tags worth showing on a card, most useful first */
export const getTagLabels = (tags: EventTags, audience: string[]): string[] => {
  const labels: string[] = [];
  if (tags.goodForSolo) labels.push('Good for going solo');
  if (tags.firstTimersWelcome) labels.push('First-timers welcome');
  if (tags.alcoholFree) labels.push('Alcohol-free');
  if (tags.stepFreeEntry) labels.push('Step-free');
  return [...labels, ...audience];
};

interface EventCardProps {
  event: EventWithDistance;
  nowMs: number;
  color: ActivityColor;
  icon: string;
  onPress: () => void;
}

/** Full-width event listing for activity lists */
export const EventCard: React.FC<EventCardProps> = ({ event, nowMs, color, icon, onPress }) => {
  const palette = ACTIVITY_PALETTE[color];
  const image = event.images[0];
  const timing = getTimingFor(event, nowMs);
  const isLive = timing.state === 'on_now' || timing.state === 'starting_soon';

  const when =
    timing.state === 'on_now'
      ? `Until ${formatClock(event.endsAt.toMillis())}`
      : formatClock(event.startsAt.toMillis());

  const meta = [
    when,
    event.venueName,
    event.distanceKm !== undefined ? formatDistanceLabel(event.distanceKm) : null,
    formatCover(event.coverCents),
  ]
    .filter(Boolean)
    .join(' · ');

  const tagLabels = getTagLabels(event.tags, event.audience).slice(0, 3);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9} accessibilityRole="button">
      <View style={[styles.photo, { backgroundColor: palette.tint }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <ActivityIcon icon={icon} color={palette.shade} size={36} />
        )}

        <View style={[styles.badge, styles.badgeLeft]}>
          <Text style={[styles.badgeText, isLive && styles.badgeTextLive]}>
            {formatTimingBadge(event, nowMs)}
          </Text>
        </View>

        {event.busyLevel && (
          <View style={[styles.badge, styles.badgeRight]}>
            <BusyIndicator level={event.busyLevel} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {meta}
        </Text>

        {(event.perkLabel || tagLabels.length > 0) && (
          <View style={styles.tags}>
            {event.perkLabel && <Tag label={`${event.perkLabel} when you arrive`} variant="perk" />}
            {tagLabels.map((label) => (
              <Tag key={label} label={label} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photo: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  badgeLeft: {
    left: 12,
  },
  badgeRight: {
    right: 12,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  badgeTextLive: {
    color: COLORS.primaryDark,
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: COLORS.text,
    marginBottom: 2,
  },
  meta: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
});
