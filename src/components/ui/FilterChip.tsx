import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { C, FONT } from '../../constants/theme';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryMuted,
  },
  label: {
    color: C.textSub,
    fontSize: 13,
    fontFamily: FONT.medium,
  },
  labelSelected: {
    color: C.primary,
  },
});
