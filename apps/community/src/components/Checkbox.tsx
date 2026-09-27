import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, error }) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.row}
      onPress={() => onChange(!checked)}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.box, checked && styles.boxChecked, !!error && styles.boxError]}>
        {checked && <MaterialCommunityIcons name="check-bold" size={18} color={COLORS.surface} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
    {error && (
      <Text style={styles.error} accessibilityRole="alert">
        {error}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  boxError: {
    borderColor: COLORS.error,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.text,
  },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
  },
});
