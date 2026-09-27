import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReminderAction, ReminderStatus, describeReminder, getReminderAction } from '../../types';
import { COLORS, FONTS } from '../../constants/theme';

const ACTION_LABELS: Record<ReminderAction, string> = {
  allow: 'Remind me',
  turn_on: 'Turn on',
  open_settings: 'Open settings',
};

interface ReminderNoteProps {
  status: ReminderStatus;
  startsAtMs: number;
  nowMs: number;
  /** Called when the person asks for reminders. The phone asks them to allow it. */
  onTurnOn: () => void;
}

/** What to expect after saving an event, and the step to take if reminders aren't on */
export const ReminderNote: React.FC<ReminderNoteProps> = ({ status, startsAtMs, nowMs, onTurnOn }) => {
  const action = getReminderAction(status, startsAtMs, nowMs);

  const handleAction = () => {
    if (action === 'open_settings') {
      Linking.openSettings().catch((e) => console.error('[Reminders] Could not open settings:', e));
      return;
    }
    onTurnOn();
  };

  return (
    <View style={styles.note}>
      <MaterialCommunityIcons
        name={status === 'on' && !action ? 'bell-ring-outline' : 'bell-outline'}
        size={18}
        color={COLORS.textSecondary}
      />
      <Text style={styles.text}>{describeReminder(status, startsAtMs, nowMs)}</Text>
      {action && (
        <TouchableOpacity
          style={styles.action}
          onPress={handleAction}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.actionText}>{ACTION_LABELS[action]}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  action: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
  },
  actionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primaryDark,
  },
});
