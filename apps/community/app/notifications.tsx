import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FilterPill } from '../src/components/events';
import { useEventStore } from '../src/store/eventStore';
import { useNotificationStore } from '../src/store/notificationStore';
import {
  canScheduleNotifications,
  requestNotificationPermission,
} from '../src/services/notifications';
import { formatClock } from '../src/utils/events';
import { COLORS, FONTS } from '../src/constants/theme';

const formatWhen = (ms: number): string => {
  const day = new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${formatClock(ms)}`;
};

interface ToggleRowProps {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, detail, value, onChange, disabled }) => (
  <View style={[styles.toggleRow, disabled && styles.disabled]}>
    <View style={styles.toggleText}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowDetail}>{detail}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: '#D9D5CB', true: COLORS.primary }}
      thumbColor={COLORS.surface}
      accessibilityLabel={title}
    />
  </View>
);

export default function NotificationsScreen() {
  const router = useRouter();
  const { activities, loaded: eventsLoaded, loadTonight } = useEventStore();
  const { prefs, plan, loaded, load, update, reschedule } = useNotificationStore();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      if (!eventsLoaded) {
        await loadTonight();
      }
      if (!loaded) {
        await load();
      }
      await reschedule();
    };
    prepare();
    // Runs once when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  const handleEnable = async (enabled: boolean) => {
    setNotice(null);

    if (!enabled) {
      await update({ enabled: false });
      return;
    }

    const permission = await requestNotificationPermission();
    if (permission === 'denied') {
      setNotice(
        "Notifications are turned off for Community in your phone's settings. Turn them on there, then come back."
      );
      return;
    }
    await update({ enabled: true });
  };

  const toggleActivity = (activityId: string) => {
    const following = prefs.activityIds.includes(activityId)
      ? prefs.activityIds.filter((id) => id !== activityId)
      : [...prefs.activityIds, activityId];
    update({ activityIds: following });
  };

  const off = !prefs.enabled;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Nudges</Text>
          <TouchableOpacity
            style={styles.close}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.intro}>
          A reminder when something you'd like is about to start. Worked out on your phone, so what
          you follow and where you are stay with you.
        </Text>

        {!canScheduleNotifications && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Nudges are sent by the phone app. You can set them up here, and they'll start once you
              use the app on your phone.
            </Text>
          </View>
        )}

        {notice && (
          <View style={[styles.notice, styles.noticeWarning]} accessibilityRole="alert">
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        <View style={styles.card}>
          <ToggleRow
            title="Send me nudges"
            detail={off ? 'Off' : 'On'}
            value={prefs.enabled}
            onChange={handleEnable}
          />
        </View>

        <View>
          <Text style={styles.sectionTitle}>What to send</Text>
          <View style={styles.card}>
            <ToggleRow
              title="Starting soon"
              detail="An hour before, up to two a night"
              value={prefs.startingSoon}
              onChange={(value) => update({ startingSoon: value })}
              disabled={off}
            />
            <View style={styles.divider} />
            <ToggleRow
              title="Weekend lineup"
              detail="Thursdays at 5 PM"
              value={prefs.weekendLineup}
              onChange={(value) => update({ weekendLineup: value })}
              disabled={off}
            />
            <View style={styles.divider} />
            <ToggleRow
              title="Keep them discreet"
              detail="Leave out event, venue, and activity names"
              value={prefs.discreet}
              onChange={(value) => update({ discreet: value })}
              disabled={off}
            />
          </View>
        </View>

        <View style={off && styles.disabled}>
          <Text style={styles.sectionTitle}>What you're into</Text>
          <Text style={styles.sectionHint}>
            {prefs.activityIds.length === 0
              ? "You'll hear about everything. Pick a few to narrow it down."
              : `You'll hear about ${prefs.activityIds.length} ${
                  prefs.activityIds.length === 1 ? 'activity' : 'activities'
                }.`}
          </Text>
          <View style={styles.pills}>
            {activities.map((activity) => (
              <FilterPill
                key={activity.id}
                label={activity.label}
                selected={prefs.activityIds.includes(activity.id)}
                onPress={() => !off && toggleActivity(activity.id)}
              />
            ))}
          </View>
        </View>

        {!off && (
          <View>
            <Text style={styles.sectionTitle}>Coming up</Text>
            {plan.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.rowDetail}>
                  Nothing to send yet. Nudges appear here as events are posted.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {plan.map((notification) => (
                  <View key={notification.id} style={styles.planned}>
                    <Text style={styles.plannedWhen}>{formatWhen(notification.fireAtMs)}</Text>
                    <Text style={styles.rowTitle}>{notification.title}</Text>
                    <Text style={styles.rowDetail}>{notification.body}</Text>
                  </View>
                ))}
              </View>
            )}
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
    paddingBottom: 40,
    gap: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 36,
    lineHeight: 40,
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
  intro: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.textSecondary,
    marginTop: -8,
  },
  notice: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
  },
  noticeWarning: {
    backgroundColor: COLORS.errorLight,
  },
  noticeText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
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
  toggleText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  disabled: {
    opacity: 0.45,
  },
  rowTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  rowDetail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 10,
  },
  planned: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plannedWhen: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
});
