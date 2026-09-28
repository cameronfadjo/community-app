import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HomeScope, formatPeriod } from '../../types';
import { capitalize } from '../../utils/events';
import { FilterPill } from './Pill';

const PERIODS: HomeScope[] = ['today', 'week', 'month'];

interface PeriodSwitchProps {
  selected: HomeScope;
  now: Date;
  onChange: (scope: HomeScope) => void;
}

/** Today, this week, or this month */
export const PeriodSwitch: React.FC<PeriodSwitchProps> = ({ selected, now, onChange }) => (
  <View style={styles.row}>
    {PERIODS.map((period) => (
      <FilterPill
        key={period}
        label={capitalize(formatPeriod(period, now))}
        selected={selected === period}
        onPress={() => onChange(period)}
        solid
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
