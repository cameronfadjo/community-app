import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

interface FilterPillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Solid dark fill when selected, used for the "when" choices */
  solid?: boolean;
}

/** A tappable choice: a filter or a "when" option */
export const FilterPill: React.FC<FilterPillProps> = ({ label, selected, onPress, solid = false }) => (
  <TouchableOpacity
    style={[
      styles.filter,
      selected && (solid ? styles.filterSolid : styles.filterSelected),
    ]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    {selected && !solid && (
      <MaterialCommunityIcons name="check-bold" size={14} color={COLORS.info} />
    )}
    <Text style={[styles.filterText, selected && solid && styles.filterTextSolid]}>{label}</Text>
  </TouchableOpacity>
);

interface TagProps {
  label: string;
  /** Perk tags are violet, everything else neutral */
  variant?: 'neutral' | 'perk';
}

/** A small read-only label on a card */
export const Tag: React.FC<TagProps> = ({ label, variant = 'neutral' }) => (
  <View style={[styles.tag, variant === 'perk' && styles.tagPerk]}>
    <Text style={[styles.tagText, variant === 'perk' && styles.tagTextPerk]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.info,
  },
  filterSolid: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  filterText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  filterTextSolid: {
    fontFamily: FONTS.bold,
    color: COLORS.textInverse,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
  },
  tagPerk: {
    backgroundColor: COLORS.accentLight,
  },
  tagText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#4A4A60',
  },
  tagTextPerk: {
    fontFamily: FONTS.bold,
    color: COLORS.accentDark,
  },
});
