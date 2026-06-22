import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { LocationCode, MenuItemFields, MenuItemOverrides } from '../../../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../../types/menu';
import { LocationMultiSelect } from './LocationMultiSelect';
import { C, FONT } from '../../../constants/theme';

interface OverrideGroup {
  locations: LocationCode[];
  value: string;
}

function buildGroups(overrides: MenuItemOverrides, field: keyof MenuItemFields): OverrideGroup[] {
  const valueToLocs = new Map<string, LocationCode[]>();
  for (const loc of ALL_LOCATIONS) {
    const val = overrides[loc]?.[field];
    if (val !== undefined && val !== '') {
      valueToLocs.set(val, [...(valueToLocs.get(val) ?? []), loc]);
    }
  }
  return Array.from(valueToLocs.entries()).map(([value, locations]) => ({ value, locations }));
}

function applyOverride(
  overrides: MenuItemOverrides,
  field: keyof MenuItemFields,
  newLocs: LocationCode[],
  value: string,
  oldLocs: LocationCode[],
): MenuItemOverrides {
  const result: MenuItemOverrides = {};
  for (const loc of ALL_LOCATIONS) {
    const existing = { ...(overrides[loc] ?? {}) };
    if (oldLocs.includes(loc)) delete existing[field];
    if (newLocs.includes(loc) && value.trim()) existing[field] = value;
    if (Object.keys(existing).length > 0) result[loc] = existing;
  }
  return result;
}

function removeOverride(
  overrides: MenuItemOverrides,
  field: keyof MenuItemFields,
  locsToRemove: LocationCode[],
): MenuItemOverrides {
  const result: MenuItemOverrides = {};
  for (const loc of ALL_LOCATIONS) {
    const existing = { ...(overrides[loc] ?? {}) };
    if (locsToRemove.includes(loc)) delete existing[field];
    if (Object.keys(existing).length > 0) result[loc] = existing;
  }
  return result;
}

interface FieldEditorProps {
  label: string;
  field: keyof MenuItemFields;
  baseValue: string;
  onChangeBase: (v: string) => void;
  overrides: MenuItemOverrides;
  onChangeOverrides: (o: MenuItemOverrides) => void;
  selectedLocation?: LocationCode;
  multiline?: boolean;
}

interface InlineOverrideForm {
  locations: LocationCode[];
  value: string;
  oldLocs: LocationCode[];
}

export function FieldEditor({
  label, field, baseValue, onChangeBase, overrides, onChangeOverrides,
  selectedLocation, multiline = true,
}: FieldEditorProps) {
  const groups = buildGroups(overrides, field);
  const [form, setForm] = useState<InlineOverrideForm | null>(null);

  const openAdd  = () => setForm({ locations: [], value: '', oldLocs: [] });
  const openEdit = (g: OverrideGroup) =>
    setForm({ locations: [...g.locations], value: g.value, oldLocs: [...g.locations] });

  const saveForm = () => {
    if (!form) return;
    onChangeOverrides(applyOverride(overrides, field, form.locations, form.value, form.oldLocs));
    setForm(null);
  };

  const deleteGroup = (g: OverrideGroup) => {
    onChangeOverrides(removeOverride(overrides, field, g.locations));
  };

  // Locations that already have an override for this field
  const locationsWithOverride = ALL_LOCATIONS.filter(
    (loc) => overrides[loc]?.[field] !== undefined,
  );
  // When adding: all overridden locs are disabled
  // When editing a group: only locs from OTHER groups are disabled
  const disabledForForm: LocationCode[] =
    form && form.oldLocs.length > 0
      ? locationsWithOverride.filter((l) => !form.oldLocs.includes(l))
      : locationsWithOverride;

  // Visual clue: does the current selected location have an override?
  const selectedLocationHasOverride =
    selectedLocation !== undefined && overrides[selectedLocation]?.[field] !== undefined;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>

      {selectedLocationHasOverride && selectedLocation && (
        <View style={styles.overrideNotice}>
          <Text style={styles.overrideNoticeText}>
            ⚑ {LOCATION_NAMES[selectedLocation]} has a custom override — editing the base text below won't affect what that location displays
          </Text>
        </View>
      )}

      {/* Base value */}
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={baseValue}
        onChangeText={onChangeBase}
        placeholder={`Base ${label.toLowerCase()}…`}
        placeholderTextColor={C.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />

      {/* Existing override groups */}
      {groups.map((g, i) => (
        <View key={i} style={styles.group}>
          <View style={styles.groupHeader}>
            <View style={styles.groupLocs}>
              {g.locations.map((l) => (
                <View key={l} style={styles.locBadge}>
                  <Text style={styles.locBadgeText}>{LOCATION_NAMES[l]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity onPress={() => openEdit(g)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteGroup(g)} style={[styles.actionBtn, styles.actionBtnDanger]}>
                <Text style={styles.actionBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.groupValue} numberOfLines={2}>{g.value}</Text>
        </View>
      ))}

      {/* Add override button */}
      {!form && (
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add location override</Text>
        </TouchableOpacity>
      )}

      {/* Inline override form */}
      {form && (
        <View style={styles.form}>
          <LocationMultiSelect
            label="Apply to locations"
            selected={form.locations}
            onChange={(locs) => setForm((f) => f ? { ...f, locations: locs } : f)}
            disabledLocations={disabledForForm}
          />
          <TextInput
            style={[styles.input, styles.inputMulti, { marginTop: 10 }]}
            value={form.value}
            onChangeText={(v) => setForm((f) => f ? { ...f, value: v } : f)}
            placeholder={`Override ${label.toLowerCase()} for selected locations…`}
            placeholderTextColor={C.textMuted}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveForm}>
              <Text style={styles.saveBtnText}>Save Override</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setForm(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { marginBottom: 24 },
  label: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 8,
  },

  overrideNotice: {
    marginBottom: 8, padding: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,184,48,0.10)', borderWidth: 1, borderColor: C.gold,
  },
  overrideNoticeText: { fontSize: 11, color: C.gold, fontFamily: FONT.medium, lineHeight: 16 },

  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontFamily: FONT.regular, fontSize: 14,
  },
  inputMulti: { minHeight: 72 },

  group: {
    marginTop: 8, borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 10, padding: 10, backgroundColor: C.primaryMuted,
  },
  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  groupLocs:   { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1, marginRight: 8 },
  locBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: C.primary,
  },
  locBadgeText: { fontSize: 10, fontFamily: FONT.bold, color: '#fff', letterSpacing: 0.3 },

  groupActions:    { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, backgroundColor: C.surfaceHigh,
  },
  actionBtnDanger: { backgroundColor: C.errorMuted },
  actionBtnText:   { fontSize: 11, color: C.text, fontFamily: FONT.medium },
  groupValue:      { fontSize: 13, color: C.textSub, fontFamily: FONT.regular, lineHeight: 19 },

  addBtn: {
    marginTop: 8, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 10, borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  form: {
    marginTop: 10, padding: 12, borderWidth: 1,
    borderColor: C.borderBright, borderRadius: 12, backgroundColor: C.surface,
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  saveBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semiBold },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  cancelBtnText: { color: C.textSub, fontSize: 13, fontFamily: FONT.medium },
});
