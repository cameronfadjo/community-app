import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AccountButton,
  ActivityIcon,
  DayHeading,
  PrimaryButton,
  SaveButton,
} from '../../src/components/events';
import { LoadingSpinner } from '../../src/components';
import { useEventStore } from '../../src/store/eventStore';
import { useSavedStore } from '../../src/store/savedStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useActivityLookup } from '../../src/hooks/useActivityLookup';
import { useSavedEvents } from '../../src/hooks/useSavedEvents';
import { formatClock, formatDayPart } from '../../src/utils/events';
import {
  LATE_REMINDER_HOURS_BEFORE,
  SavedEvent,
  describeReminder,
  getEventTiming,
  groupEventsByDay,
} from '../../src/types';
import { ACTIVITY_PALETTE, COLORS, FONTS } from '../../src/constants/theme';

// How long "Undo" stays after something is taken off the list
const UNDO_FOR_MS = 8 * 1000;

const formatWhen = (item: SavedEvent, nowMs: number): string => {
  const timing = getEventTiming(item.startsAtMs, item.endsAtMs, nowMs);
  if (timing.state === 'on_now') {
    return `On now · until ${formatClock(item.endsAtMs)}`;
  }
  if (timing.state === 'starting_soon') {
    return `In ${timing.minutesUntilStart} min · ${formatClock(item.startsAtMs)}`;
  }
  return formatClock(item.startsAtMs);
};

export default function SavedScreen() {
  const router = useRouter();
  const { forActivity } = useActivityLookup();
  const {
    saved,
    loaded,
    removeSaved,
    restoreSaved,
    reminderStatus,
    turnOnReminders,
    turnOffReminders,
  } = useSavedEvents();
  const refresh = useSavedStore((state) => state.refresh);
  const loadTonight = useEventStore((state) => state.loadTonight);
  const reschedule = useNotificationStore((state) => state.reschedule);

  const [nowMs, setNowMs] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [takenOff, setTakenOff] = useState<SavedEvent | null>(null);

  // A host may have changed or cancelled something since it was saved
  const catchUp = useCallback(
    async (force: boolean) => {
      try {
        // Uses the events already loaded, and asks only about the rest
        await loadTonight();
        await refresh({ force });
        await reschedule();
      } catch (e) {
        console.error('[Saved] Could not check for changes:', e);
      }
      setNowMs(Date.now());
    },
    [loadTonight, refresh, reschedule]
  );

  useFocusEffect(
    useCallback(() => {
      catchUp(false);
      return () => setTakenOff(null);
    }, [catchUp])
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!takenOff) {
      return;
    }
    const timer = setTimeout(() => setTakenOff(null), UNDO_FOR_MS);
    return () => clearTimeout(timer);
  }, [takenOff]);

  const days = useMemo(() => groupEventsByDay(saved, nowMs), [saved, nowMs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await catchUp(true);
    setRefreshing(false);
  };

  const handleTakeOff = (item: SavedEvent) => {
    setTakenOff(item);
    removeSaved(item.eventId);
  };

  const handleUndo = () => {
    if (takenOff) {
      restoreSaved(takenOff);
      setTakenOff(null);
    }
  };

  const handleReminders = (wanted: boolean) => {
    if (wanted) {
      turnOnReminders();
    } else {
      turnOffReminders();
    }
  };

  if (!loaded) {
    return <LoadingSpinner fullScreen message="Finding what you saved..." />;
  }

  const remindersOn = reminderStatus === 'on' || reminderStatus === 'unsupported';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.dayPart}>{formatDayPart(new Date(nowMs))}</Text>
            <Text style={styles.heading}>Saved</Text>
          </View>
          <AccountButton />
        </View>

        <View style={styles.private}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={COLORS.text} />
          <Text style={styles.privateText}>
            Kept on this phone only. Nobody else can see what you save.
          </Text>
        </View>

        {takenOff && (
          <View style={styles.undo} accessibilityRole="alert">
            <Text style={styles.undoText} numberOfLines={2}>
              {`Took ${takenOff.title} off your list.`}
            </Text>
            <TouchableOpacity
              style={styles.undoAction}
              onPress={handleUndo}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.undoActionText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>
              Tap Save on anything you'd like to go to, and it will wait for you here.
            </Text>
            <PrimaryButton
              title="See what's on"
              variant="secondary"
              onPress={() => router.push('/(tabs)/whats-on')}
            />
          </View>
        ) : (
          <View style={styles.days}>
            {days.map((day) => (
              <View key={day.dayKey}>
                <DayHeading label={day.label} />
                <View style={styles.rows}>
                  {day.events.map((item) => {
                    const look = forActivity(item.activityIds[0] ?? '');
                    const palette = ACTIVITY_PALETTE[look.color];
                    const cancelled = item.status === 'cancelled';

                    return (
                      <View key={item.eventId} style={styles.row}>
                        <TouchableOpacity
                          style={styles.rowMain}
                          onPress={() => router.push(`/event/${item.eventId}`)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                        >
                          <View style={[styles.icon, { backgroundColor: palette.tint }]}>
                            <ActivityIcon icon={look.icon} color={palette.shade} size={22} />
                          </View>
                          <View style={styles.rowText}>
                            <Text style={styles.rowTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.rowMeta} numberOfLines={1}>
                              {`${formatWhen(item, nowMs)} · ${item.venueName}`}
                            </Text>
                            {cancelled ? (
                              <View style={styles.cancelled}>
                                <Text style={styles.cancelledText}>Cancelled</Text>
                              </View>
                            ) : (
                              reminderStatus === 'on' && (
                                <Text style={styles.rowReminder}>
                                  {describeReminder(reminderStatus, item.startsAtMs, nowMs)}
                                </Text>
                              )
                            )}
                          </View>
                        </TouchableOpacity>
                        <SaveButton saved compact onPress={() => handleTakeOff(item)} />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Remind me</Text>
                <Text style={styles.rowMeta}>
                  {`The day before. ${LATE_REMINDER_HOURS_BEFORE} hours before if you save something later than that.`}
                </Text>
              </View>
              <Switch
                value={remindersOn}
                onValueChange={handleReminders}
                trackColor={{ false: '#D9D5CB', true: COLORS.primary }}
                thumbColor={COLORS.surface}
                accessibilityLabel="Remind me about what I've saved"
              />
            </View>

            {reminderStatus === 'blocked' && (
              <View style={styles.cardNote}>
                <Text style={styles.cardNoteText}>
                  Notifications are turned off for Community in your phone's settings.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openSettings().catch(() => undefined)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={styles.undoActionText}>Open settings</Text>
                </TouchableOpacity>
              </View>
            )}

            {reminderStatus === 'unsupported' && (
              <View style={styles.cardNote}>
                <Text style={styles.cardNoteText}>Reminders are sent by the phone app.</Text>
              </View>
            )}
          </View>
          <Text style={styles.footnote}>
            Reminders are set on your phone. We never learn what you saved.
          </Text>
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
  private: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
  },
  privateText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.text,
  },
  undoText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textInverse,
  },
  undoAction: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  undoActionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primaryDark,
  },
  days: {
    gap: 16,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  rowReminder: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  cancelled: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.errorLight,
  },
  cancelledText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.error,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 8,
  },
  card: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 64,
    paddingVertical: 8,
  },
  cardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardNoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  footnote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  empty: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
});
