import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, FONT } from '../../constants/theme';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.label}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 10,
  },
  label: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: C.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
});
