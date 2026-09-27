import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

interface DayHeadingProps {
  /** "Today", "Tomorrow", or "Saturday, Oct 17" */
  label: string;
}

/** Sits above each day's events in a list that covers more than one day */
export const DayHeading: React.FC<DayHeadingProps> = ({ label }) => (
  <Text style={styles.heading} accessibilityRole="header">
    {label}
  </Text>
);

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
});
