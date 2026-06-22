import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, Alert, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, MenuItem } from '../../../types/menu';
import { renameSubCategory, deleteSubCategory } from '../../../services/categoryService';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { C, FONT } from '../../../constants/theme';

interface SubCategoryEditModalProps {
  visible: boolean;
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
}

interface EditingState { oldName: string; draft: string; }

export function SubCategoryEditModal({ visible, categories, items, onClose }: SubCategoryEditModalProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [catPickerOpen, setCatPickerOpen]        = useState(false);
  const [editing, setEditing]   = useState<EditingState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [newSubCat, setNewSubCat] = useState('');

  // Sub-categories for the selected category, sorted alphabetically
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    return [
      ...new Set(
        items
          .filter((i) => i.category === selectedCategory && i.subCategory)
          .map((i) => i.subCategory),
      ),
    ].sort();
  }, [items, selectedCategory]);

  const itemCountFor = (subCat: string) =>
    items.filter((i) => i.category === selectedCategory && i.subCategory === subCat).length;

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!editing || !selectedCategory) return;
    const newName = editing.draft.trim();
    if (!newName || newName === editing.oldName) { setEditing(null); return; }
    if (subCategories.includes(newName)) {
      Alert.alert('Already exists', `Sub-category "${newName}" already exists in this category.`);
      return;
    }
    setSaving(true);
    try {
      await renameSubCategory(selectedCategory, editing.oldName, newName);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      setEditing(null);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete (clears sub_category field on all matching items) ──────────────
  const handleDelete = (subCat: string) => {
    const count = itemCountFor(subCat);
    const doDelete = async () => {
      setSaving(true);
      try {
        await deleteSubCategory(selectedCategory, subCat);
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      } catch (e) {
        Alert.alert('Error', (e as Error).message);
      } finally {
        setSaving(false);
      }
    };
    const msg = count > 0
      ? `"${subCat}" will be removed from ${count} item${count !== 1 ? 's' : ''} in ${selectedCategory}.`
      : `Remove sub-category "${subCat}"?`;
    if (Platform.OS === 'web') {
      if ((window as Window & typeof globalThis).confirm(msg)) void doDelete();
    } else {
      Alert.alert('Remove sub-category?', msg, [
        { text: 'Remove', style: 'destructive', onPress: () => void doDelete() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sub-Categories</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Category picker */}
        <View style={styles.catPickerWrap}>
          <Text style={styles.sectionLabel}>Select category</Text>
          <TouchableOpacity
            style={styles.catTrigger}
            onPress={() => setCatPickerOpen((v) => !v)}
          >
            <Text style={selectedCategory ? styles.catTriggerValue : styles.catTriggerPlaceholder}>
              {selectedCategory || 'Choose a category…'}
            </Text>
            <Text style={styles.catTriggerArrow}>{catPickerOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {catPickerOpen && (
            <View style={styles.catDropdown}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catOption, cat.name === selectedCategory && styles.catOptionActive]}
                    onPress={() => {
                      setSelectedCategory(cat.name);
                      setCatPickerOpen(false);
                      setEditing(null);
                      setNewSubCat('');
                    }}
                  >
                    <Text style={[styles.catOptionText, cat.name === selectedCategory && styles.catOptionTextActive]}>
                      {cat.name}
                    </Text>
                    {cat.name === selectedCategory && <Text style={styles.catOptionCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Sub-category list */}
        {selectedCategory ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {subCategories.length === 0 && (
              <Text style={styles.emptyText}>No sub-categories in "{selectedCategory}" yet.</Text>
            )}
            {subCategories.map((subCat) => {
              const isEditing = editing?.oldName === subCat;
              const count = itemCountFor(subCat);
              return (
                <View key={subCat} style={styles.row}>
                  <View style={styles.nameWrap}>
                    {isEditing ? (
                      <TextInput
                        style={styles.nameInput}
                        value={editing.draft}
                        onChangeText={(v) => setEditing((e) => e ? { ...e, draft: v } : e)}
                        onSubmitEditing={() => void handleRename()}
                        autoFocus
                        returnKeyType="done"
                      />
                    ) : (
                      <>
                        <Text style={styles.subCatName}>{subCat}</Text>
                        <Text style={styles.subCatCount}>{count} item{count !== 1 ? 's' : ''}</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.actions}>
                    {isEditing ? (
                      <>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => void handleRename()} disabled={saving}>
                          <Text style={styles.actionSave}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(null)}>
                          <Text style={styles.actionCancel}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => setEditing({ oldName: subCat, draft: subCat })}
                        >
                          <Text style={styles.actionEdit}>Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(subCat)}>
                          <Text style={styles.actionDelete}>Remove</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Add new sub-category note */}
            <View style={styles.addNote}>
              <Text style={styles.addNoteText}>
                New sub-categories are created by setting a custom value when editing an item.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Pick a category above to manage its sub-categories.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title:        { fontSize: 18, fontFamily: FONT.semiBold, color: C.text },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },

  catPickerWrap: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionLabel:  { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 8 },
  catTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  catTriggerValue:       { fontSize: 14, color: C.text,    fontFamily: FONT.medium, flex: 1 },
  catTriggerPlaceholder: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, flex: 1 },
  catTriggerArrow:       { fontSize: 10, color: C.textMuted, marginLeft: 8 },
  catDropdown: {
    marginTop: 4, borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 10, backgroundColor: C.surface, overflow: 'hidden',
  },
  catOption:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  catOptionActive:   { backgroundColor: C.primaryMuted },
  catOptionText:     { fontSize: 14, color: C.text, fontFamily: FONT.regular },
  catOptionTextActive: { color: C.primary, fontFamily: FONT.semiBold },
  catOptionCheck:    { fontSize: 13, color: C.primary, fontFamily: FONT.bold },

  scroll:  { flex: 1 },
  content: { padding: 12, paddingBottom: 20 },

  emptyText:  { fontSize: 13, color: C.textMuted, fontFamily: FONT.regular, fontStyle: 'italic', paddingVertical: 20, textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyStateText: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 22 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  nameWrap:   { flex: 1 },
  subCatName: { fontSize: 15, color: C.text, fontFamily: FONT.semiBold },
  subCatCount:{ fontSize: 11, color: C.textMuted, fontFamily: FONT.regular, marginTop: 2 },
  nameInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: C.text, fontFamily: FONT.semiBold, fontSize: 15,
  },

  actions:      { flexDirection: 'row', gap: 6 },
  actionBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surfaceHigh },
  actionEdit:   { fontSize: 12, color: C.primary, fontFamily: FONT.medium },
  actionDelete: { fontSize: 12, color: C.error,   fontFamily: FONT.medium },
  actionSave:   { fontSize: 12, color: C.accent,  fontFamily: FONT.medium },
  actionCancel: { fontSize: 12, color: C.textSub, fontFamily: FONT.medium },

  addNote: {
    marginTop: 20, padding: 12, borderRadius: 10,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
  },
  addNoteText: { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular, lineHeight: 18, textAlign: 'center' },

  footer:   { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  doneBtn:  { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
});
