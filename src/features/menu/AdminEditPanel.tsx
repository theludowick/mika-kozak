import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList, TouchableOpacity,
  Alert, Modal, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { MenuItem, MenuItemFields, MenuItemOverrides, MenuItemPhoto, LocationCode } from '../../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import { PhotoCarousel } from './components/PhotoCarousel';
import { FieldEditor } from './components/FieldEditor';
import { LocationMultiSelect } from './components/LocationMultiSelect';
import { uploadMenuPhoto, deleteMenuPhoto, updatePhotoMeta } from '../../services/photoService';
import { updateMenuItem } from '../../services/menuService';
import { useCategories } from '../../services/categoryService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { C, FONT } from '../../constants/theme';

interface AdminEditPanelProps {
  item: MenuItem;
  selectedLocation: LocationCode;
  allItems: MenuItem[];
  onSave: () => void;
  onCancel: () => void;
}

// ── Inline dropdown picker ────────────────────────────────────────────────────

function InlinePicker({
  label, value, options, placeholder, onChange, allowCustom = false,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customVal, setCustomVal] = useState('');

  return (
    <View>
      <Text style={pickerStyles.label}>{label}</Text>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={value ? pickerStyles.triggerValue : pickerStyles.triggerPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={pickerStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {options.length === 0 && !allowCustom && (
              <Text style={pickerStyles.emptyOption}>No options available</Text>
            )}
            {value !== '' && (
              <TouchableOpacity
                style={pickerStyles.option}
                onPress={() => { onChange(''); setOpen(false); }}
              >
                <Text style={[pickerStyles.optionText, { color: C.textMuted, fontStyle: 'italic' }]}>
                  None
                </Text>
              </TouchableOpacity>
            )}
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[pickerStyles.option, opt === value && pickerStyles.optionActive]}
                onPress={() => { onChange(opt); setOpen(false); }}
              >
                <Text style={[pickerStyles.optionText, opt === value && pickerStyles.optionTextActive]}>
                  {opt}
                </Text>
                {opt === value && <Text style={pickerStyles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            {allowCustom && (
              <View style={pickerStyles.customRow}>
                <TextInput
                  style={pickerStyles.customInput}
                  value={customVal}
                  onChangeText={setCustomVal}
                  placeholder="New sub-category…"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (customVal.trim()) { onChange(customVal.trim()); setCustomVal(''); setOpen(false); }
                  }}
                />
                <TouchableOpacity
                  style={[pickerStyles.customAddBtn, !customVal.trim() && { opacity: 0.4 }]}
                  disabled={!customVal.trim()}
                  onPress={() => { onChange(customVal.trim()); setCustomVal(''); setOpen(false); }}
                >
                  <Text style={pickerStyles.customAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  label: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  triggerValue:       { fontSize: 14, color: C.text, fontFamily: FONT.regular, flex: 1 },
  triggerPlaceholder: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, flex: 1 },
  arrow:              { fontSize: 10, color: C.textMuted, marginLeft: 8 },
  dropdown: {
    borderWidth: 1, borderColor: C.borderBright, borderRadius: 10,
    backgroundColor: C.surface, marginTop: 4, overflow: 'hidden',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  optionActive:     { backgroundColor: C.primaryMuted },
  optionText:       { fontSize: 14, color: C.text, fontFamily: FONT.regular },
  optionTextActive: { color: C.primary, fontFamily: FONT.semiBold },
  optionCheck:      { fontSize: 13, color: C.primary, fontFamily: FONT.bold },
  emptyOption:      { padding: 14, fontSize: 13, color: C.textMuted, fontFamily: FONT.regular, fontStyle: 'italic' },
  customRow: {
    flexDirection: 'row', gap: 8, padding: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  customInput: {
    flex: 1, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    color: C.text, fontFamily: FONT.regular, fontSize: 13,
  },
  customAddBtn:     { paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  customAddBtnText: { color: '#fff', fontSize: 12, fontFamily: FONT.semiBold },
});

// ── Main panel ────────────────────────────────────────────────────────────────

export function AdminEditPanel({ item, selectedLocation, allItems, onSave, onCancel }: AdminEditPanelProps) {
  const queryClient = useQueryClient();
  const { data: categoryData } = useCategories();

  // ── Draft state ───────────────────────────────────────────────────────────
  const [name, setName]               = useState(item.name);
  const [category, setCategory]       = useState(item.category);
  const [subCategory, setSubCategory] = useState(item.subCategory);
  const [fields, setFields]           = useState<MenuItemFields>({ ...item.fields });
  const [overrides, setOverrides]     = useState<MenuItemOverrides>({ ...item.overrides });
  const [itemLocations, setItemLocations] = useState<LocationCode[]>(
    item.locations.length === 0 ? [...ALL_LOCATIONS] : [...item.locations],
  );
  const [relatedIds, setRelatedIds] = useState<string[]>([...item.relatedIds]);
  const [saving, setSaving]         = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // ── Pending upload sub-screen ─────────────────────────────────────────────
  const [pendingUri, setPendingUri]   = useState<string | null>(null);
  const [pendingLocs, setPendingLocs] = useState<LocationCode[]>([selectedLocation]);
  const [pendingNote, setPendingNote] = useState('');
  const [uploading, setUploading]     = useState(false);

  // ── Edit-photo sub-screen ─────────────────────────────────────────────────
  const [editingPhoto, setEditingPhoto]   = useState<MenuItemPhoto | null>(null);
  const [editPhotoLocs, setEditPhotoLocs] = useState<LocationCode[]>([]);
  const [editPhotoNote, setEditPhotoNote] = useState<string>('');

  // ── Related items sub-screen ──────────────────────────────────────────────
  const [relatedItemsOpen, setRelatedItemsOpen] = useState(false);
  const [relatedSearch, setRelatedSearch]       = useState('');

  // ── Derived picker options ────────────────────────────────────────────────
  const categoryOptions = useMemo(
    () => (categoryData ?? []).map((c) => c.name),
    [categoryData],
  );
  const subCategoryOptions = useMemo(() => {
    const source = category
      ? allItems.filter((i) => i.category === category)
      : allItems;
    return [...new Set(source.map((i) => i.subCategory).filter(Boolean))].sort();
  }, [allItems, category]);

  const setField = (field: keyof MenuItemFields) => (value: string) =>
    setFields((f) => ({ ...f, [field]: value }));

  // ── Unsaved-changes detection ─────────────────────────────────────────────
  const hasUnsavedChanges = useCallback((): boolean => {
    const origLocs = item.locations.length === 0 ? [...ALL_LOCATIONS] : [...item.locations];
    return (
      name !== item.name ||
      category !== item.category ||
      subCategory !== item.subCategory ||
      JSON.stringify(fields) !== JSON.stringify(item.fields) ||
      JSON.stringify(overrides) !== JSON.stringify(item.overrides) ||
      JSON.stringify([...itemLocations].sort()) !== JSON.stringify([...origLocs].sort()) ||
      JSON.stringify([...relatedIds].sort()) !== JSON.stringify([...item.relatedIds].sort())
    );
  }, [name, category, subCategory, fields, overrides, itemLocations, relatedIds, item]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    setSaving(true);
    try {
      const locationsToSave = itemLocations.length === ALL_LOCATIONS.length ? [] : itemLocations;
      await updateMenuItem(item.id, {
        name: name.trim(),
        category: category.trim(),
        subCategory: subCategory.trim(),
        ...fields,
        locations: locationsToSave,
        overrides,
        relatedIds,
      });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      onSave();
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [name, category, subCategory, fields, overrides, itemLocations, relatedIds, item.id, onSave, queryClient]);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const handleRequestCancel = useCallback(() => {
    if (!hasUnsavedChanges()) { onCancel(); return; }
    setShowUnsavedModal(true);
  }, [hasUnsavedChanges, onCancel]);

  const requestCancelRef = useRef(handleRequestCancel);
  requestCancelRef.current = handleRequestCancel;

  // ── Photo: pick ───────────────────────────────────────────────────────────
  const handlePickPhoto = async (source: 'camera' | 'library') => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    setPendingUri(result.assets[0].uri);
    setPendingLocs([selectedLocation]);
    setPendingNote('');
  };

  const promptPhotoSource = () => {
    if (Platform.OS === 'web') { void handlePickPhoto('library'); return; }
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Take Photo',          onPress: () => void handlePickPhoto('camera') },
      { text: 'Choose from Library', onPress: () => void handlePickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Photo: upload ─────────────────────────────────────────────────────────
  const handleConfirmUpload = async () => {
    if (!pendingUri) return;
    setUploading(true);
    try {
      await uploadMenuPhoto(item.id, pendingUri, pendingLocs, pendingNote.trim() || undefined);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      setPendingUri(null);
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // ── Photo: delete ─────────────────────────────────────────────────────────
  const handleDeletePhoto = (photo: MenuItemPhoto) => {
    const doDelete = async () => {
      setDeletingPhotoId(photo.id);
      try {
        await deleteMenuPhoto(photo.id, photo.imageUrl);
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      } catch (e) {
        Alert.alert('Error', (e as Error).message);
      } finally {
        setDeletingPhotoId(null);
      }
    };
    if (Platform.OS === 'web') {
      if ((window as Window & typeof globalThis).confirm('Delete this photo? This cannot be undone.')) void doDelete();
      return;
    }
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Photo: edit meta ──────────────────────────────────────────────────────
  const handleOpenEditPhoto = (photo: MenuItemPhoto) => {
    setEditingPhoto(photo);
    setEditPhotoLocs([...photo.locations]);
    setEditPhotoNote(photo.note ?? '');
  };

  const handleSavePhotoMeta = async () => {
    if (!editingPhoto) return;
    try {
      await updatePhotoMeta(editingPhoto.id, editPhotoLocs, editPhotoNote.trim() || null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      setEditingPhoto(null);
    } catch (e) { Alert.alert('Error', (e as Error).message); }
  };

  // ── Shared X-button ───────────────────────────────────────────────────────
  const XButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={headerStyles.closeBtn} onPress={onPress} accessibilityLabel="Close">
      <Text style={headerStyles.closeIcon}>✕</Text>
    </TouchableOpacity>
  );

  // ── Sub-screen: pending upload ────────────────────────────────────────────
  if (pendingUri) {
    const { Image } = require('react-native') as typeof import('react-native');
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ headerLeft: () => <XButton onPress={() => setPendingUri(null)} />, headerRight: () => null, gestureEnabled: false }} />
        <Text style={styles.sectionHeader}>Assign Photo to Locations</Text>
        <View style={styles.carouselWrap}>
          <View style={styles.previewWrap}>
            <Image source={{ uri: pendingUri }} style={styles.previewImage} resizeMode="cover" />
          </View>
        </View>
        <LocationMultiSelect label="Assign to locations" selected={pendingLocs} onChange={setPendingLocs} showSelectAll />
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={pendingNote}
          onChangeText={setPendingNote}
          placeholder="e.g. Summer plating, gluten-free version…"
          placeholderTextColor={C.textMuted}
        />
        <View style={[styles.actionRow, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, (uploading || pendingLocs.length === 0) && styles.btnDisabled]}
            onPress={() => void handleConfirmUpload()}
            disabled={uploading || pendingLocs.length === 0}
          >
            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Upload</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingUri(null)} disabled={uploading}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Sub-screen: edit photo ────────────────────────────────────────────────
  if (editingPhoto) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ headerLeft: () => <XButton onPress={() => setEditingPhoto(null)} />, headerRight: () => null, gestureEnabled: false }} />
        <Text style={styles.sectionHeader}>Edit Photo</Text>
        <View style={styles.carouselWrap}>
          <PhotoCarousel photos={[editingPhoto]} fallbackUrl={null} location={selectedLocation} />
        </View>
        <LocationMultiSelect label="Assign to locations" selected={editPhotoLocs} onChange={setEditPhotoLocs} showSelectAll />
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={editPhotoNote}
          onChangeText={setEditPhotoNote}
          placeholder="e.g. Summer plating, gluten-free version…"
          placeholderTextColor={C.textMuted}
        />
        <View style={[styles.actionRow, { marginTop: 20 }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSavePhotoMeta()}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPhoto(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Sub-screen: related items (pinned selected to top) ────────────────────
  if (relatedItemsOpen) {
    const searchLower = relatedSearch.trim().toLowerCase();
    const candidateItems = allItems
      .filter(
        (i) =>
          i.id !== item.id &&
          (!searchLower ||
            i.name.toLowerCase().includes(searchLower) ||
            i.category.toLowerCase().includes(searchLower)),
      )
      .sort((a, b) => {
        // Selected items always float to the top
        const aSelected = relatedIds.includes(a.csvId);
        const bSelected = relatedIds.includes(b.csvId);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.name.localeCompare(b.name);
      });

    const toggleRelated = (csvId: string) =>
      setRelatedIds((prev) =>
        prev.includes(csvId) ? prev.filter((id) => id !== csvId) : [...prev, csvId],
      );

    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{
          headerLeft: () => <XButton onPress={() => { setRelatedItemsOpen(false); setRelatedSearch(''); }} />,
          headerRight: () => null,
          gestureEnabled: false,
        }} />
        <View style={styles.relatedHeader}>
          <Text style={styles.sectionHeader}>Related Items</Text>
          <TextInput
            style={styles.input}
            value={relatedSearch}
            onChangeText={setRelatedSearch}
            placeholder="Search by name or category…"
            placeholderTextColor={C.textMuted}
          />
        </View>
        <FlatList
          data={candidateItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item: relItem, index }) => {
            const selected = relatedIds.includes(relItem.csvId);
            const prevSelected = index > 0 && relatedIds.includes(candidateItems[index - 1]?.csvId ?? '');
            const showDivider = !selected && index > 0 && prevSelected;
            return (
              <>
                {showDivider && <View style={styles.relatedDivider} />}
                <TouchableOpacity
                  style={[styles.relatedRow, selected && styles.relatedRowSelected]}
                  onPress={() => toggleRelated(relItem.csvId)}
                >
                  <View style={styles.relatedRowInfo}>
                    <Text style={styles.relatedRowName}>{relItem.name}</Text>
                    {relItem.category ? <Text style={styles.relatedRowCat}>{relItem.category}</Text> : null}
                  </View>
                  {selected && <Text style={styles.relatedRowCheck}>✓</Text>}
                </TouchableOpacity>
              </>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchLower ? `No items match "${relatedSearch}"` : 'No other items available'}
            </Text>
          }
        />
        <View style={styles.relatedFooter}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => { setRelatedItemsOpen(false); setRelatedSearch(''); }}
          >
            <Text style={styles.saveBtnText}>Done — {relatedIds.length} selected</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main edit panel ───────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{
        headerLeft: () => <XButton onPress={() => requestCancelRef.current()} />,
        headerTitle: '',
        headerRight: () => (
          <TouchableOpacity
            style={[headerStyles.saveBtn, saving && headerStyles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.primary} size="small" />
              : <Text style={headerStyles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        ),
        gestureEnabled: false,
      }} />

      {/* 1. Photos — first block */}
      <Text style={styles.sectionHeader}>Photos</Text>
      <View style={styles.carouselWrap}>
        <PhotoCarousel
          photos={item.photos}
          fallbackUrl={item.imageUrl}
          location={selectedLocation}
          isEditMode
          deletingPhotoId={deletingPhotoId}
          onDeletePhoto={handleDeletePhoto}
          onEditPhoto={handleOpenEditPhoto}
        />
      </View>
      {itemLocations.length > 0 && !itemLocations.includes(selectedLocation) && (
        <View style={styles.locationWarning}>
          <Text style={styles.locationWarningText}>
            ⚠ This item is not available at {LOCATION_NAMES[selectedLocation]}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.addPhotoBtn, item.photos.length >= 5 && styles.btnDisabled]}
        onPress={promptPhotoSource}
        disabled={item.photos.length >= 5}
      >
        <Text style={styles.addPhotoBtnText}>
          {item.photos.length >= 5 ? 'Max 5 photos reached' : '+ Add Photo'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* 2. Name */}
      <Text style={styles.sectionHeader}>Item Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Item name…"
        placeholderTextColor={C.textMuted}
      />

      {/* 3. Category + SubCategory dropdowns */}
      <View style={[styles.twoCol, { marginTop: 16 }]}>
        <View style={{ flex: 1 }}>
          <InlinePicker
            label="Category"
            value={category}
            options={categoryOptions}
            placeholder="Select category…"
            onChange={(v) => { setCategory(v); setSubCategory(''); }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <InlinePicker
            label="Sub-Category"
            value={subCategory}
            options={subCategoryOptions}
            placeholder="Select sub-category…"
            onChange={setSubCategory}
            allowCustom
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* 4. Availability */}
      <LocationMultiSelect
        label="Available at locations"
        selected={itemLocations}
        onChange={setItemLocations}
        showSelectAll
      />

      <View style={styles.divider} />

      {/* 5. Field editors */}
      {(
        [
          ['Ingredients',  'ingredients'],
          ['Description',  'description'],
          ['Presentation', 'presentation'],
          ['Facts',        'facts'],
          ['Upsell',       'upsell'],
          ['Takeout',      'takeout'],
        ] as [string, keyof MenuItemFields][]
      ).map(([label, field]) => (
        <FieldEditor
          key={field}
          label={label}
          field={field}
          baseValue={fields[field]}
          onChangeBase={setField(field)}
          overrides={overrides}
          onChangeOverrides={setOverrides}
          selectedLocation={selectedLocation}
        />
      ))}

      <View style={styles.divider} />

      {/* 6. Related items — last content block */}
      <Text style={styles.sectionHeader}>Related Items</Text>
      {relatedIds.length > 0 ? (
        <View style={styles.relatedChips}>
          {relatedIds.map((csvId) => {
            const relItem = allItems.find((i) => i.csvId === csvId);
            if (!relItem) return null;
            return (
              <View key={csvId} style={styles.relatedChip}>
                <Text style={styles.relatedChipText} numberOfLines={1}>{relItem.name}</Text>
                <TouchableOpacity
                  style={styles.relatedChipX}
                  onPress={() => setRelatedIds((prev) => prev.filter((id) => id !== csvId))}
                >
                  <Text style={styles.relatedChipXText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>No related items linked</Text>
      )}
      <TouchableOpacity style={[styles.addPhotoBtn, { marginTop: 10 }]} onPress={() => setRelatedItemsOpen(true)}>
        <Text style={styles.addPhotoBtnText}>Browse & Connect Items</Text>
      </TouchableOpacity>

      <Modal visible={showUnsavedModal} transparent animationType="fade" onRequestClose={() => setShowUnsavedModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Unsaved changes</Text>
            <Text style={styles.confirmBody}>What would you like to do with your edits?</Text>
            <TouchableOpacity style={styles.confirmBtnSave} onPress={() => { setShowUnsavedModal(false); void handleSave(); }}>
              <Text style={styles.confirmBtnSaveText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnDiscard} onPress={() => { setShowUnsavedModal(false); onCancel(); }}>
              <Text style={styles.confirmBtnDiscardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnKeep} onPress={() => setShowUnsavedModal(false)}>
              <Text style={styles.confirmBtnKeepText}>Keep Editing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const headerStyles = StyleSheet.create({
  closeBtn: {
    marginLeft: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },
  saveBtn: {
    marginRight: 12, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10, backgroundColor: C.primary,
  },
  saveBtnText:     { fontSize: 14, color: '#fff', fontFamily: FONT.semiBold },
  saveBtnDisabled: { opacity: 0.45 },
});

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  sectionHeader: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 10,
  },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontFamily: FONT.regular, fontSize: 15,
  },
  twoCol: { flexDirection: 'row', gap: 12 },

  carouselWrap: { width: '65%', alignSelf: 'center' },
  previewWrap:  { marginBottom: 16 },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },

  locationWarning: {
    marginTop: 8, padding: 10, borderRadius: 8,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderBright,
  },
  locationWarningText: {
    fontSize: 12, color: C.textSub, fontFamily: FONT.medium, textAlign: 'center',
  },

  addPhotoBtn: {
    marginTop: 10, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', backgroundColor: C.surface,
  },
  addPhotoBtnText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },

  relatedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  relatedChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryMuted, borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 20, paddingLeft: 12, paddingRight: 6, paddingVertical: 5, maxWidth: 200,
  },
  relatedChipText:  { fontSize: 12, color: C.text, fontFamily: FONT.medium, flex: 1 },
  relatedChipX:     { width: 18, height: 18, borderRadius: 9, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  relatedChipXText: { fontSize: 9, color: C.textSub, fontFamily: FONT.bold },

  emptyText: { fontSize: 13, color: C.textMuted, fontFamily: FONT.regular, fontStyle: 'italic', marginBottom: 4 },

  // Related sub-screen
  relatedHeader:    { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  relatedDivider:   { height: 1, backgroundColor: C.borderBright, marginHorizontal: 16, marginVertical: 4 },
  relatedRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  relatedRowSelected: { backgroundColor: C.primaryMuted },
  relatedRowInfo:   { flex: 1 },
  relatedRowName:   { fontSize: 14, color: C.text, fontFamily: FONT.semiBold },
  relatedRowCat:    { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular, marginTop: 2 },
  relatedRowCheck:  { fontSize: 16, color: C.primary, fontFamily: FONT.bold, paddingHorizontal: 8 },
  relatedFooter:    { padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  actionRow:    { flexDirection: 'row', gap: 10, marginTop: 8 },
  saveBtn:      { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  cancelBtn:    { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelBtnText:{ color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
  btnDisabled:  { opacity: 0.45 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  confirmCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.border, gap: 10,
  },
  confirmTitle:           { fontSize: 18, fontFamily: FONT.semiBold, color: C.text, marginBottom: 2 },
  confirmBody:            { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, lineHeight: 20, marginBottom: 6 },
  confirmBtnSave:         { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  confirmBtnSaveText:     { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  confirmBtnDiscard:      { paddingVertical: 13, borderRadius: 12, backgroundColor: C.error, alignItems: 'center' },
  confirmBtnDiscardText:  { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  confirmBtnKeep:         { paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  confirmBtnKeepText:     { color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
});
