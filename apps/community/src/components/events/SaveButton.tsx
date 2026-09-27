import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

interface SaveButtonProps {
  saved: boolean;
  onPress: () => void;
  /** Icon only, for lists. The label is still read out. */
  compact?: boolean;
  disabled?: boolean;
}

/**
 * Saves an event to come back to. What someone saves stays on their phone:
 * it is a note to themselves, not a public "I'm going".
 */
export const SaveButton: React.FC<SaveButtonProps> = ({
  saved,
  onPress,
  compact = false,
  disabled = false,
}) => (
  <TouchableOpacity
    style={[
      compact ? styles.compact : styles.button,
      saved && styles.saved,
      disabled && styles.disabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityState={{ selected: saved, disabled }}
    aria-selected={saved}
    accessibilityLabel={saved ? 'Saved. Tap to take it off your list' : 'Save this event'}
  >
    <MaterialCommunityIcons
      name={saved ? 'bookmark' : 'bookmark-outline'}
      size={compact ? 22 : 20}
      color={saved ? COLORS.primaryDark : COLORS.text}
    />
    {!compact && <Text style={[styles.text, saved && styles.textSaved]}>{saved ? 'Saved' : 'Save'}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saved: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  textSaved: {
    color: COLORS.primaryDark,
  },
});
