import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  Modal, Alert, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, MenuItem, LocationCode } from '../../../types/menu';
import { useSubCategories } from '../../../services/categoryService';
import { createMenuItem } from '../../../services/menuService';
import { uploadMenuPhoto } from '../../../services/photoService';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { LocationMultiSelect } from './LocationMultiSelect';
import { C, FONT } from '../../../constants/theme';

interface ItemFormModalProps {
  visible: boolean;
  categories: Category[];
  items: MenuItem[];
  initialCategory?: string;
  initialSubCategory?: string;
  onClose: () => void;
  onCreated?: (itemId: string) => void;
}

type PendingImage = { uri: string; locations: LocationCode[]; note: string };

const EMPTY_FORM = {
  name: '',
  category: '',
  subCategory: '',
  locations: [] as LocationCode[],
  ingredients: '',
  description: '',
  presentation: '',
  takeout: '',
  facts: '',
  upsell: '',
};

type FormErrors = Partial<Record<'name' | 'category' | 'subCategory' | 'locations', boolean>>;

export function ItemFormModal({ visible, categories, items, initialCategory, initialSubCategory, onClose, onCreated }: ItemFormModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [saving, setSaving]         = useState(false);
  const [catOpen, setCatOpen]       = useState(false);
  const [subCatOpen, setSubCatOpen] = useState(false);

  // Queued photos (uploaded after item creation)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  // Photo sub-screen state (mirrors AdminEditPanel)
  const [pendingUri, setPendingUri]   = useState<string | null>(null);
  const [pendingLocs, setPendingLocs] = useState<LocationCode[]>([]);
  const [pendingNote, setPendingNote] = useState('');

  const { data: allSubCats = [] } = useSubCategories();

  const subCatOptions = useMemo(
    () => allSubCats.filter((s) => s.category === form.category),
    [allSubCats, form.category],
  );

  const nextSortOrder = useMemo(() => {
    if (!form.category) return 0;
    return items.filter((i) => i.category === form.category).length;
  }, [items, form.category]);

  useEffect(() => {
    if (visible) {
      setForm({ ...EMPTY_FORM, category: initialCategory ?? '', subCategory: initialSubCategory ?? '' });
      setPendingImages([]);
      setPendingUri(null);
      setPendingLocs([]);
      setPendingNote('');
      setErrors({});
      setCatOpen(false);
      setSubCatOpen(false);
    }
  }, [visible, initialCategory, initialSubCategory]);

  const set = (key: keyof typeof EMPTY_FORM) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    if (key === 'name' || key === 'category' || key === 'subCategory') {
      setErrors((e) => ({ ...e, [key]: false }));
    }
  };

  // ── Photo picking (mirrors AdminEditPanel) ─────────────────────────────────
  const handlePickPhoto = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required to take photos.'); return; }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    setPendingUri(result.assets[0].uri);
    setPendingLocs(form.locations.length > 0 ? [...form.locations] : []);
    setPendingNote('');
  };

  const promptPhotoSource = () => {
    if (pendingImages.length >= 5) return;
    if (Platform.OS === 'web') { void handlePickPhoto('library'); return; }
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Take Photo',          onPress: () => void handlePickPhoto('camera') },
      { text: 'Choose from Library', onPress: () => void handlePickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Confirm queues the image; actual upload happens after item creation in handleSubmit
  const handleConfirmPhoto = () => {
    if (!pendingUri || pendingLocs.length === 0) return;
    setPendingImages((prev) => [...prev, { uri: pendingUri, locations: pendingLocs, note: pendingNote.trim() }]);
    setPendingUri(null);
    setPendingLocs([]);
    setPendingNote('');
  };

  const removeImage = (idx: number) => setPendingImages((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const newErrors: FormErrors = {};
    if (!form.name.trim())      newErrors.name        = true;
    if (!form.category)         newErrors.category    = true;
    if (!form.subCategory)      newErrors.subCategory = true;
    if (!form.locations.length) newErrors.locations   = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Required fields', 'Please fill in all required fields highlighted in red.');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const id = await createMenuItem({
        name: form.name.trim(), category: form.category, subCategory: form.subCategory,
        locations: form.locations, ingredients: form.ingredients.trim(),
        description: form.description.trim(), presentation: form.presentation.trim(),
        takeout: form.takeout.trim(), facts: form.facts.trim(), upsell: form.upsell.trim(),
        sortOrder: nextSortOrder,
      });
      for (const img of pendingImages) {
        await uploadMenuPhoto(id, img.uri, img.locations, img.note || undefined);
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      onCreated?.(id);
      onClose();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>

        {/* ── Photo sub-screen ───────────────────────────────────────────────── */}
        {pendingUri ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setPendingUri(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontFamily: FONT.semiBold, color: C.text }}>Assign Photo</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionHeader}>Assign Photo to Locations</Text>
              <View style={styles.previewWrap}>
                <Image source={{ uri: pendingUri }} style={styles.previewImage} resizeMode="cover" />
              </View>
              <LocationMultiSelect
                label="Assign to locations"
                selected={pendingLocs}
                onChange={setPendingLocs}
                showSelectAll
              />
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
                  style={[styles.saveBtn, pendingLocs.length === 0 && styles.btnDisabled]}
                  onPress={handleConfirmPhoto}
                  disabled={pendingLocs.length === 0}
                >
                  <Text style={styles.saveBtnText}>Add Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingUri(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        ) : (
          /* ── Main form ──────────────────────────────────────────────────── */
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerSaveBtn, saving && styles.btnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.headerSaveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

              {/* 1. Photos */}
              <Text style={styles.sectionHeader}>Photos</Text>
              {pendingImages.length > 0 && (
                <View style={styles.carouselWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {pendingImages.map((img, idx) => (
                      <View key={img.uri + idx} style={styles.photoThumb}>
                        <Image source={{ uri: img.uri }} style={styles.thumbImg} resizeMode="cover" />
                        <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImage(idx)}>
                          <Text style={styles.thumbRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              <TouchableOpacity
                style={[styles.addPhotoBtn, pendingImages.length >= 5 && styles.btnDisabled]}
                onPress={promptPhotoSource}
                disabled={pendingImages.length >= 5}
              >
                <Text style={styles.addPhotoBtnText}>
                  {pendingImages.length >= 5 ? 'Max 5 photos reached' : '+ Add Photo'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* 2. Item Name */}
              <Text style={[styles.sectionHeader, errors.name && styles.sectionHeaderError]}>Item Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={form.name}
                onChangeText={(v) => { setForm((f) => ({ ...f, name: v })); setErrors((e) => ({ ...e, name: false })); }}
                placeholder="Item name…"
                placeholderTextColor={errors.name ? C.error : C.textMuted}
              />

              {/* 3. Category + Sub-category */}
              <View style={[styles.twoCol, { marginTop: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, errors.category && styles.sectionHeaderError]}>Category *</Text>
                  <TouchableOpacity
                    style={[styles.pickerTrigger, !!initialCategory && styles.pickerLocked, errors.category && styles.pickerError]}
                    onPress={() => { if (!initialCategory) { setCatOpen((v) => !v); setSubCatOpen(false); } }}
                  >
                    <Text style={form.category ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
                      {form.category || 'Select…'}
                    </Text>
                    {!initialCategory && <Text style={styles.pickerArrow}>{catOpen ? '▲' : '▼'}</Text>}
                  </TouchableOpacity>
                  {catOpen && (
                    <View style={styles.dropdown}>
                      <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                        {categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.dropdownOption, cat.name === form.category && styles.dropdownOptionActive]}
                            onPress={() => {
                              setForm((f) => ({ ...f, category: cat.name, subCategory: '' }));
                              setErrors((e) => ({ ...e, category: false, subCategory: false }));
                              setCatOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, cat.name === form.category && styles.dropdownOptionTextActive]}>
                              {cat.name}
                            </Text>
                            {cat.name === form.category && <Text style={styles.dropdownCheck}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, errors.subCategory && styles.sectionHeaderError]}>Sub-category *</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerTrigger,
                      !form.category && styles.pickerDisabled,
                      !!initialSubCategory && styles.pickerLocked,
                      errors.subCategory && styles.pickerError,
                    ]}
                    onPress={() => { if (form.category && !initialSubCategory) { setSubCatOpen((v) => !v); setCatOpen(false); } }}
                  >
                    <Text style={form.subCategory ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
                      {!form.category ? 'Category first' : (form.subCategory || 'Select…')}
                    </Text>
                    {!!form.category && !initialSubCategory && (
                      <Text style={styles.pickerArrow}>{subCatOpen ? '▲' : '▼'}</Text>
                    )}
                  </TouchableOpacity>
                  {subCatOpen && (
                    <View style={styles.dropdown}>
                      <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                        {subCatOptions.length === 0 ? (
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.dropdownEmptyText}>No sub-categories for this category yet.</Text>
                          </View>
                        ) : (
                          subCatOptions.map((s) => (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.dropdownOption, s.name === form.subCategory && styles.dropdownOptionActive]}
                              onPress={() => {
                                setForm((f) => ({ ...f, subCategory: s.name }));
                                setErrors((e) => ({ ...e, subCategory: false }));
                                setSubCatOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownOptionText, s.name === form.subCategory && styles.dropdownOptionTextActive]}>
                                {s.name}
                              </Text>
                              {s.name === form.subCategory && <Text style={styles.dropdownCheck}>✓</Text>}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* 4. Locations */}
              <Text style={[styles.sectionHeader, errors.locations && styles.sectionHeaderError]}>
                Available at locations *
              </Text>
              <View style={errors.locations ? styles.locationsError : undefined}>
                <LocationMultiSelect
                  selected={form.locations}
                  onChange={(locs) => { setForm((f) => ({ ...f, locations: locs })); setErrors((e) => ({ ...e, locations: false })); }}
                  showSelectAll
                />
              </View>

              <View style={styles.divider} />

              {/* 5. Content fields */}
              {([
                ['Ingredients',  'ingredients',  'List main ingredients…'],
                ['Description',  'description',  'Item description…'],
                ['Presentation', 'presentation', 'Plating and presentation notes…'],
                ['Facts',        'facts',        'Fun facts, allergens…'],
                ['Upsell',       'upsell',       'Upsell suggestions…'],
                ['Takeout',      'takeout',      'Takeout instructions…'],
              ] as [string, keyof typeof EMPTY_FORM, string][]).map(([label, field, placeholder]) => (
                <View key={field} style={styles.fieldBlock}>
                  <Text style={styles.sectionHeader}>{label}</Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={form[field] as string}
                    onChangeText={set(field)}
                    multiline
                    numberOfLines={3}
                    placeholder={placeholder}
                    placeholderTextColor={C.textMuted}
                    textAlignVertical="top"
                  />
                </View>
              ))}

            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },
  headerSaveBtn:     { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary },
  headerSaveBtnText: { fontSize: 14, color: '#fff', fontFamily: FONT.semiBold },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  sectionHeader: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 10,
  },
  sectionHeaderError: { color: C.error },

  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontFamily: FONT.regular, fontSize: 15,
  },
  inputMulti: { minHeight: 72, paddingTop: 10 },
  inputError: { borderColor: C.error, backgroundColor: C.errorMuted },

  twoCol: { flexDirection: 'row', gap: 12 },

  pickerLabel: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 8,
  },
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  pickerDisabled: { opacity: 0.45 },
  pickerLocked:   { borderColor: C.borderBright, backgroundColor: C.surfaceHigh },
  pickerError:    { borderColor: C.error, backgroundColor: C.errorMuted },
  pickerValue:       { fontSize: 14, color: C.text,      fontFamily: FONT.regular, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, flex: 1 },
  pickerArrow:       { fontSize: 10, color: C.textMuted, marginLeft: 8 },

  dropdown: {
    borderWidth: 1, borderColor: C.borderBright, borderRadius: 10,
    backgroundColor: C.surface, marginTop: 4, overflow: 'hidden',
  },
  dropdownEmpty:     { padding: 14 },
  dropdownEmptyText: { fontSize: 13, color: C.textMuted, fontFamily: FONT.regular, fontStyle: 'italic' },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownOptionActive:     { backgroundColor: C.primaryMuted },
  dropdownOptionText:       { fontSize: 14, color: C.text, fontFamily: FONT.regular },
  dropdownOptionTextActive: { color: C.primary, fontFamily: FONT.semiBold },
  dropdownCheck:            { fontSize: 13, color: C.primary, fontFamily: FONT.bold },

  locationsError: {
    borderWidth: 1, borderColor: C.error, borderRadius: 10,
    backgroundColor: C.errorMuted, padding: 4,
  },

  // Photo sub-screen
  previewWrap:  { marginBottom: 16 },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },

  // Photo thumbnails on main form
  carouselWrap: { marginBottom: 10 },
  photoThumb: {
    width: 100, height: 100, borderRadius: 10, marginRight: 8,
    overflow: 'hidden', position: 'relative',
  },
  thumbImg:    { width: 100, height: 100 },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { color: '#fff', fontSize: 10, fontFamily: FONT.bold },

  addPhotoBtn: {
    paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', backgroundColor: C.surface,
  },
  addPhotoBtnText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },

  fieldBlock: { marginBottom: 16 },

  actionRow:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  saveBtn:       { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  cancelBtn:     { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelBtnText: { color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
  btnDisabled:   { opacity: 0.45 },
});
