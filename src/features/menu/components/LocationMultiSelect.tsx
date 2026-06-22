import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { LocationCode } from '../../../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../../types/menu';
import { C, FONT } from '../../../constants/theme';

interface LocationMultiSelectProps {
  selected: LocationCode[];
  onChange: (locs: LocationCode[]) => void;
  label?: string;
  showSelectAll?: boolean;
  disabledLocations?: LocationCode[];
}

export function LocationMultiSelect({
  selected,
  onChange,
  label,
  showSelectAll = false,
  disabledLocations = [],
}: LocationMultiSelectProps) {
  const toggle = (loc: LocationCode) => {
    if (disabledLocations.includes(loc)) return;
    if (selected.includes(loc)) {
      onChange(selected.filter((l) => l !== loc));
    } else {
      onChange([...selected, loc]);
    }
  };

  const allSelected = ALL_LOCATIONS.every((l) => selected.includes(l));

  return (
    <View>
      <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        {showSelectAll && (
          <TouchableOpacity onPress={() => onChange(allSelected ? [] : [...ALL_LOCATIONS])}>
            <Text style={styles.selectAllBtn}>{allSelected ? 'Clear' : 'All'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.row}>
        {ALL_LOCATIONS.map((loc) => {
          const active   = selected.includes(loc);
          const disabled = disabledLocations.includes(loc);
          return (
            <TouchableOpacity
              key={loc}
              style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
              onPress={() => toggle(loc)}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled }}
            >
              <Text style={[styles.chipName, active && styles.chipNameActive, disabled && styles.chipNameDisabled]}>
                {LOCATION_NAMES[loc]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.textMuted,
    fontFamily: FONT.semiBold,
  },
  selectAllBtn: { fontSize: 12, color: C.primary, fontFamily: FONT.semiBold },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive:   { borderColor: C.borderBright, backgroundColor: C.primaryMuted },
  chipDisabled: { opacity: 0.35 },

  chipName:         { fontSize: 12, fontFamily: FONT.medium, color: C.textMuted },
  chipNameActive:   { color: C.primary },
  chipNameDisabled: { color: C.textMuted },
});
