import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, Alert, StyleSheet, Platform, ActivityIndicator, FlatList,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Category, MenuItem } from '../../../types/menu';
import { renameCategory, deleteCategory, reorderCategories } from '../../../services/categoryService';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { C, FONT } from '../../../constants/theme';

interface CategoryEditModalProps {
  visible: boolean;
  categories: Category[];
  items: MenuItem[];
  isLoading?: boolean;
  isError?: boolean;
  onClose: () => void;
}

const ROW_H = 60;

// ── Draggable row ─────────────────────────────────────────────────────────────

interface SortableRowProps {
  cat: Category;
  catIndex: number;
  totalCount: number;
  draggingIndexSV: SharedValue<number>;
  isEditing: boolean;
  editDraft: string;
  itemCount: number;
  saving: boolean;
  onDragStart: (i: number) => void;
  onDragMove: (target: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onRename: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onStartEdit: (cat: Category) => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
}

function SortableRow({
  cat, catIndex, totalCount, draggingIndexSV,
  isEditing, editDraft, itemCount, saving,
  onDragStart, onDragMove, onDragEnd,
  onRename, onDelete, onStartEdit, onEditChange, onEditSubmit, onEditCancel,
}: SortableRowProps) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onBegin(() => {
      draggingIndexSV.value = catIndex;
      runOnJS(onDragStart)(catIndex);
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      const t = Math.max(0, Math.min(totalCount - 1, Math.round(catIndex + e.translationY / ROW_H)));
      runOnJS(onDragMove)(t);
    })
    .onEnd((e) => {
      const t = Math.max(0, Math.min(totalCount - 1, Math.round(catIndex + e.translationY / ROW_H)));
      translateY.value = withSpring(0, { duration: 250 });
      draggingIndexSV.value = -1;
      runOnJS(onDragEnd)(catIndex, t);
    })
    .onFinalize(() => {
      translateY.value = withSpring(0, { duration: 250 });
      draggingIndexSV.value = -1;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: draggingIndexSV.value === catIndex ? translateY.value : 0 }],
    zIndex: draggingIndexSV.value === catIndex ? 100 : 1,
    shadowOpacity: draggingIndexSV.value === catIndex ? 0.35 : 0,
    elevation: draggingIndexSV.value === catIndex ? 10 : 0,
    backgroundColor: draggingIndexSV.value === catIndex ? C.surfaceHigh : 'transparent',
    borderRadius: draggingIndexSV.value === catIndex ? 10 : 0,
  }));

  return (
    <Animated.View style={animStyle}>
      <View style={styles.row}>
        {/* Drag handle */}
        <GestureDetector gesture={pan}>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleIcon}>≡</Text>
          </View>
        </GestureDetector>

        {/* Name / rename input */}
        <View style={styles.nameWrap}>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editDraft}
              onChangeText={onEditChange}
              onSubmitEditing={onEditSubmit}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={onEditSubmit} disabled={saving}>
                <Text style={styles.actionSave}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onEditCancel}>
                <Text style={styles.actionCancel}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onStartEdit(cat)}>
                <Text style={styles.actionEdit}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(cat)}>
                <Text style={styles.actionDelete}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface EditingState { id: string; draft: string; }

export function CategoryEditModal({ visible, categories, items, isLoading, isError, onClose }: CategoryEditModalProps) {
  const queryClient = useQueryClient();
  const [localOrder, setLocalOrder] = useState<Category[]>([]);
  const [editing, setEditing]       = useState<EditingState | null>(null);
  const [saving, setSaving]         = useState(false);

  // Drag state
  const draggingIndexSV = useSharedValue(-1);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex]     = useState<number | null>(null);

  // Add category
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalOrder([...categories]);
      setEditing(null);
      setNewCatName('');
    }
  }, [visible, categories]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragStart = useCallback((i: number) => {
    setDraggingIndex(i);
    setTargetIndex(i);
  }, []);

  const onDragMove = useCallback((target: number) => {
    setTargetIndex(target);
  }, []);

  const commitDrag = useCallback((from: number, to: number) => {
    if (from !== to) {
      setLocalOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        return next;
      });
    }
    setDraggingIndex(null);
    setTargetIndex(null);
  }, []);

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!editing) return;
    const cat = localOrder.find((c) => c.id === editing.id);
    if (!cat) return;
    const newName = editing.draft.trim();
    if (!newName || newName === cat.name) { setEditing(null); return; }
    setSaving(true);
    try {
      await renameCategory(cat.id, cat.name, newName);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      setEditing(null);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (cat: Category) => {
    const inUse = items.some((i) => i.category === cat.name);
    if (inUse) {
      Alert.alert('Cannot delete', `"${cat.name}" still has items. Move them to another category first.`);
      return;
    }
    const doDelete = async () => {
      setSaving(true);
      try {
        await deleteCategory(cat.id);
        setLocalOrder((prev) => prev.filter((c) => c.id !== cat.id));
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      } catch (e) {
        Alert.alert('Error', (e as Error).message);
      } finally {
        setSaving(false);
      }
    };
    if (Platform.OS === 'web') {
      if ((window as Window & typeof globalThis).confirm(`Delete category "${cat.name}"?`)) void doDelete();
    } else {
      Alert.alert('Delete category?', `"${cat.name}" will be removed.`, [
        { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── Add category ──────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (localOrder.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `Category "${name}" already exists.`);
      return;
    }
    setAddingCat(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, sort_order: localOrder.length })
        .select('id, name, sort_order')
        .single();
      if (error) throw new Error(error.message);
      const newCat: Category = { id: data.id as string, name: data.name as string, sortOrder: data.sort_order as number };
      setLocalOrder((prev) => [...prev, newCat]);
      setNewCatName('');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAddingCat(false);
    }
  };

  // ── Save order ────────────────────────────────────────────────────────────
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await reorderCategories(localOrder.map((c) => c.id));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Categories</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Add category input */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newCatName}
            onChangeText={setNewCatName}
            placeholder="New category name…"
            placeholderTextColor={C.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => void handleAddCategory()}
          />
          <TouchableOpacity
            style={[styles.addBtn, (!newCatName.trim() || addingCat) && styles.btnDisabled]}
            onPress={() => void handleAddCategory()}
            disabled={!newCatName.trim() || addingCat}
          >
            {addingCat ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
          </TouchableOpacity>
        </View>

        {/* List */}
        {isLoading && (
          <View style={styles.centeredMsg}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={styles.centeredText}>Loading categories…</Text>
          </View>
        )}
        {isError && !isLoading && (
          <View style={styles.centeredMsg}>
            <Text style={[styles.centeredText, { color: C.error }]}>
              Failed to load categories — run migration 004 in Supabase.
            </Text>
          </View>
        )}
        {!isLoading && !isError && localOrder.length === 0 && (
          <View style={styles.centeredMsg}>
            <Text style={styles.centeredText}>No categories yet. Add one above.</Text>
          </View>
        )}

        <FlatList
          data={localOrder}
          keyExtractor={(c) => c.id}
          scrollEnabled={draggingIndex === null}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: cat, index }) => {
            const isEditing    = editing?.id === cat.id;
            const itemCount    = items.filter((i) => i.category === cat.name).length;
            const isTargeted   = draggingIndex !== null && targetIndex === index && targetIndex !== draggingIndex;
            const isDragDown   = draggingIndex !== null && draggingIndex < index;
            // Show line BELOW target when dragging down, ABOVE when dragging up
            const showLineBefore = isTargeted && !isDragDown;
            const showLineAfter  = isTargeted && isDragDown;
            return (
              <>
                {showLineBefore && <View style={styles.dropLine} />}
                <SortableRow
                  key={cat.id}
                  cat={cat}
                  catIndex={index}
                  totalCount={localOrder.length}
                  draggingIndexSV={draggingIndexSV}
                  isEditing={isEditing}
                  editDraft={isEditing ? (editing?.draft ?? '') : ''}
                  itemCount={itemCount}
                  saving={saving}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={commitDrag}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onStartEdit={(c) => setEditing({ id: c.id, draft: c.name })}
                  onEditChange={(v) => setEditing((e) => e ? { ...e, draft: v } : e)}
                  onEditSubmit={() => void handleRename()}
                  onEditCancel={() => setEditing(null)}
                />
                {showLineAfter && <View style={styles.dropLine} />}
              </>
            );
          }}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveOrderBtn, saving && styles.btnDisabled]}
            onPress={() => void handleSaveOrder()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveOrderBtnText}>Save Order & Close</Text>}
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
  title:       { fontSize: 18, fontFamily: FONT.semiBold, color: C.text },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:{ fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },

  addRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  addInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    color: C.text, fontFamily: FONT.regular, fontSize: 14,
    userSelect: 'none',
  },
  addBtn: {
    paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semiBold },

  listContent: { padding: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.border, minHeight: ROW_H,
    userSelect: 'none',
  },

  dragHandle:     { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  dragHandleIcon: { fontSize: 24, color: C.textMuted, fontFamily: FONT.bold, letterSpacing: 1 },

  nameWrap:  { flex: 1 },
  catName:   { fontSize: 15, color: C.text, fontFamily: FONT.semiBold },
  catCount:  { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular, marginTop: 2 },
  nameInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: C.text, fontFamily: FONT.semiBold, fontSize: 15,
  },

  actions:      { flexDirection: 'row', gap: 6 },
  actionBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surfaceHigh },
  actionEdit:   { fontSize: 12, color: C.primary,  fontFamily: FONT.medium },
  actionDelete: { fontSize: 12, color: C.error,    fontFamily: FONT.medium },
  actionSave:   { fontSize: 12, color: C.accent,   fontFamily: FONT.medium },
  actionCancel: { fontSize: 12, color: C.textSub,  fontFamily: FONT.medium },

  dropLine: { height: 2, backgroundColor: C.primary, marginHorizontal: 8, borderRadius: 1 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  saveOrderBtn: { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveOrderBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  btnDisabled: { opacity: 0.45 },

  centeredMsg:  { paddingVertical: 40, alignItems: 'center', gap: 12 },
  centeredText: { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, textAlign: 'center' },
});
