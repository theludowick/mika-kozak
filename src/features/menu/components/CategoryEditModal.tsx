import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, Alert, StyleSheet, Platform, ActivityIndicator, FlatList,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
  withSequence, runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Category, MenuItem } from '../../../types/menu';
import type { SubCategory } from '../../../services/categoryService';
import {
  renameCategory, deleteCategory, reorderCategories,
  useSubCategories,
  addSubCategory, renameSubCategoryFull, moveSubCategoryToCategory,
  deleteSubCategoryFull, reorderSubCategories,
} from '../../../services/categoryService';
import { reorderMenuItems } from '../../../services/menuService';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { ItemFormModal } from './ItemFormModal';
import { C, FONT } from '../../../constants/theme';

interface CategoryEditModalProps {
  visible: boolean;
  categories: Category[];
  items: MenuItem[];
  isLoading?: boolean;
  isError?: boolean;
  onClose: () => void;
  onEditItem?: (itemId: string) => void;
}

const ROW_H = 60;
type ModalView = 'categories' | 'subcategories' | 'items';

function calcTarget(idx: number, dy: number, total: number, rowH: number) {
  const raw = Math.round(idx + dy / rowH);
  const movingDown = dy > 0 && raw > idx;
  return Math.max(0, Math.min(total - 1, movingDown ? raw + 1 : raw));
}

// ── Drill-down header ─────────────────────────────────────────────────────────

function DrillHeader({ title, onBack, onClose }: { title: string; onBack: () => void; onClose: () => void }) {
  return (
    <View style={styles.subHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.subHeaderTitle} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Category row ──────────────────────────────────────────────────────────────

interface CatRowProps {
  cat: Category;
  catIndex: number;
  totalCount: number;
  draggingIndexSV: SharedValue<number>;
  isEditing: boolean;
  editDraft: string;
  itemCount: number;
  subCatCount: number;
  saving: boolean;
  onDragStart: (i: number) => void;
  onDragMove: (t: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onOpenSubCats: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function CatRow({
  cat, catIndex, totalCount, draggingIndexSV,
  isEditing, editDraft, itemCount, subCatCount, saving,
  onDragStart, onDragMove, onDragEnd,
  onOpenSubCats, onStartEdit, onEditChange, onEditSubmit, onEditCancel, onDelete,
}: CatRowProps) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onBegin(() => { draggingIndexSV.value = catIndex; runOnJS(onDragStart)(catIndex); })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(calcTarget(catIndex, e.translationY, totalCount, ROW_H));
    })
    .onEnd((e) => {
      const t = calcTarget(catIndex, e.translationY, totalCount, ROW_H);
      translateY.value = withSpring(0, { duration: 250 });
      draggingIndexSV.value = -1;
      runOnJS(onDragEnd)(catIndex, t);
    })
    .onFinalize(() => { translateY.value = withSpring(0, { duration: 250 }); draggingIndexSV.value = -1; });

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
      <View style={[styles.row, { userSelect: 'none' }]}>
        <GestureDetector gesture={pan}>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleIcon}>≡</Text>
          </View>
        </GestureDetector>

        <TouchableOpacity style={styles.nameWrap} onPress={onOpenSubCats}>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editDraft}
              onChangeText={onEditChange}
              onSubmitEditing={onEditSubmit}
              autoFocus returnKeyType="done"
            />
          ) : (
            <>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catMeta}>
                {itemCount} item{itemCount !== 1 ? 's' : ''}
                {subCatCount > 0 ? `  ·  ${subCatCount} sub-categor${subCatCount !== 1 ? 'ies' : 'y'}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={onEditSubmit} disabled={saving}>
                <Text style={styles.actionSave}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onEditCancel}>
                <Text style={styles.actionCancel}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={onStartEdit}>
                <Text style={styles.actionEdit}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                <Text style={styles.actionDelete}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Sub-category view ─────────────────────────────────────────────────────────

interface SubCatViewProps {
  category: Category;
  subCategories: SubCategory[];
  allCategories: Category[];
  items: MenuItem[];
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  onOpenItems: (sub: SubCategory | null) => void;
}

function SubCatView({ category, subCategories, allCategories, items, onBack, onClose, onSaved, onOpenItems }: SubCatViewProps) {
  const queryClient = useQueryClient();

  const catSubCats = useMemo(
    () => subCategories.filter((s) => s.category === category.name),
    [subCategories, category.name],
  );

  const noSubCatCount = useMemo(
    () => items.filter((i) => i.category === category.name && (!i.subCategory || i.subCategory.trim() === '')).length,
    [items, category.name],
  );

  const [localOrder, setLocalOrder]  = useState<SubCategory[]>([]);
  const [draggingIndex, setDragging] = useState<number | null>(null);
  const [targetIndex, setTarget]     = useState<number | null>(null);
  const draggingIndexSV              = useSharedValue(-1);
  const [saving, setSaving]          = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName]         = useState('');
  const [addingSub, setAddingSub]     = useState(false);

  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [renamingSub, setRenamingSub]   = useState(false);

  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => { setLocalOrder(catSubCats); setDragging(null); setTarget(null); }, [catSubCats]);

  const onDragStart = useCallback((i: number) => { setDragging(i); setTarget(i); }, []);
  const onDragMove  = useCallback((t: number) => setTarget(t), []);
  const commitDrag  = useCallback((from: number, to: number) => {
    if (from !== to) {
      setLocalOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        return next;
      });
    }
    setDragging(null); setTarget(null);
  }, []);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subCategories });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (localOrder.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `"${name}" already exists in this category.`); return;
    }
    setAddingSub(true);
    try {
      await addSubCategory(name, category.name, localOrder.length);
      invalidate(); setNewName(''); setShowAddForm(false);
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setAddingSub(false); }
  };

  const handleRename = async (sub: SubCategory) => {
    const name = editingDraft.trim();
    if (!name || name === sub.name) { setEditingId(null); return; }
    if (localOrder.some((s) => s.id !== sub.id && s.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `"${name}" already exists.`); return;
    }
    setRenamingSub(true);
    try {
      await renameSubCategoryFull(sub.id, category.name, sub.name, name);
      invalidate(); setEditingId(null);
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setRenamingSub(false); }
  };

  const handleMove = async (sub: SubCategory, toCategory: string) => {
    setMovingId(null);
    try {
      await moveSubCategoryToCategory(sub.id, sub.name, category.name, toCategory);
      invalidate();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
  };

  const handleDelete = (sub: SubCategory) => {
    const count = items.filter((i) => i.category === category.name && i.subCategory === sub.name).length;
    const doDelete = async () => {
      try { await deleteSubCategoryFull(sub.id, category.name, sub.name); invalidate(); }
      catch (e) { Alert.alert('Error', (e as Error).message); }
    };
    const msg = count > 0
      ? `Remove "${sub.name}"? It will be cleared from ${count} item${count !== 1 ? 's' : ''}.`
      : `Remove sub-category "${sub.name}"?`;
    if (Platform.OS === 'web') {
      if ((window as Window & typeof globalThis).confirm(msg)) void doDelete();
    } else {
      Alert.alert('Remove?', msg, [
        { text: 'Remove', style: 'destructive', onPress: () => void doDelete() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await reorderSubCategories(localOrder.map((s) => s.id));
      invalidate();
      onSaved();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <DrillHeader title={category.name} onBack={onBack} onClose={onClose} />

      <View style={styles.countRow}>
        <Text style={styles.countText}>{localOrder.length} sub-categor{localOrder.length !== 1 ? 'ies' : 'y'}</Text>
        {!showAddForm && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addBtnText}>+ Add Sub-category</Text>
          </TouchableOpacity>
        )}
      </View>

      {showAddForm && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Sub-category name…"
            placeholderTextColor={C.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => void handleAdd()}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.addBtn, (!newName.trim() || addingSub) && styles.btnDisabled]}
            onPress={() => void handleAdd()}
            disabled={!newName.trim() || addingSub}
          >
            {addingSub ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setShowAddForm(false); setNewName(''); }}>
            <Text style={styles.cancelAddBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {localOrder.length === 0 && noSubCatCount === 0 && (
        <View style={styles.centeredMsg}>
          <Text style={styles.centeredText}>No sub-categories yet.</Text>
        </View>
      )}

      <FlatList
        data={localOrder}
        keyExtractor={(s) => s.id}
        scrollEnabled={draggingIndex === null}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: sub, index }) => {
          const isTargeted = draggingIndex !== null && targetIndex === index && targetIndex !== draggingIndex;
          const isDragDown = draggingIndex !== null && draggingIndex < index;
          const isEditing  = editingId === sub.id;
          const count      = items.filter((i) => i.category === category.name && i.subCategory === sub.name).length;
          const isMoving   = movingId === sub.id;
          const othercats  = allCategories.filter((c) => c.name !== category.name);

          return (
            <>
              {isTargeted && !isDragDown && <View style={styles.dropLine} />}
              <Animated.View style={{ userSelect: 'none' } as object}>
                <View style={styles.row}>
                  <GestureDetector gesture={Gesture.Pan()
                    .activateAfterLongPress(150)
                    .onBegin(() => { draggingIndexSV.value = index; runOnJS(setDragging)(index); runOnJS(setTarget)(index); })
                    .onUpdate((e) => {
                      runOnJS(setTarget)(calcTarget(index, e.translationY, localOrder.length, ROW_H));
                    })
                    .onEnd((e) => {
                      const t = calcTarget(index, e.translationY, localOrder.length, ROW_H);
                      draggingIndexSV.value = -1;
                      runOnJS(commitDrag)(index, t);
                    })
                    .onFinalize(() => { draggingIndexSV.value = -1; })
                  }>
                    <View style={styles.dragHandle}>
                      <Text style={styles.dragHandleIcon}>≡</Text>
                    </View>
                  </GestureDetector>

                  {isEditing ? (
                    <View style={[styles.nameWrap, { flexDirection: 'row', gap: 6 }]}>
                      <TextInput
                        style={[styles.nameInput, { flex: 1 }]}
                        value={editingDraft}
                        onChangeText={setEditingDraft}
                        onSubmitEditing={() => void handleRename(sub)}
                        autoFocus returnKeyType="done"
                      />
                      <TouchableOpacity style={styles.actionBtn} onPress={() => void handleRename(sub)} disabled={renamingSub}>
                        <Text style={styles.actionSave}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingId(null)}>
                        <Text style={styles.actionCancel}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.nameWrap} onPress={() => onOpenItems(sub)}>
                      <Text style={styles.catName}>{sub.name}</Text>
                      <Text style={styles.catMeta}>{count} item{count !== 1 ? 's' : ''}</Text>
                    </TouchableOpacity>
                  )}

                  {!isEditing && (
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingId(sub.id); setEditingDraft(sub.name); }}>
                        <Text style={styles.actionEdit}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => setMovingId(isMoving ? null : sub.id)}>
                        <Text style={styles.actionMove}>Move</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(sub)}>
                        <Text style={styles.actionDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {isMoving && (
                  <View style={styles.movePicker}>
                    <Text style={styles.movePickerLabel}>Move to category</Text>
                    {othercats.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.movePickerOption}
                        onPress={() => void handleMove(sub, cat.name)}
                      >
                        <Text style={styles.movePickerOptionText}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.movePickerOption} onPress={() => setMovingId(null)}>
                      <Text style={[styles.movePickerOptionText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
              {isTargeted && isDragDown && <View style={styles.dropLine} />}
            </>
          );
        }}
        ListFooterComponent={noSubCatCount > 0 ? (
          <TouchableOpacity style={styles.noneRow} onPress={() => onOpenItems(null)}>
            <View style={styles.noneRowLeft}>
              <Text style={styles.catName}>No sub-category</Text>
              <Text style={styles.catMeta}>{noSubCatCount} item{noSubCatCount !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ) : null}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={() => void handleSaveOrder()}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Items view ────────────────────────────────────────────────────────────────

interface ItemsViewProps {
  category: Category;
  subCat: SubCategory | null;
  allItems: MenuItem[];
  categories: Category[];
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  onEditItem?: (itemId: string) => void;
}

function ItemsView({ category, subCat, allItems, categories, onBack, onClose, onSaved, onEditItem }: ItemsViewProps) {
  const queryClient = useQueryClient();

  const filteredItems = useMemo(() => {
    if (subCat) {
      return allItems.filter((i) => i.category === category.name && i.subCategory === subCat.name);
    }
    return allItems.filter((i) => i.category === category.name && (!i.subCategory || i.subCategory.trim() === ''));
  }, [allItems, category.name, subCat]);

  const [localOrder, setLocalOrder]  = useState<MenuItem[]>([]);
  const [draggingIndex, setDragging] = useState<number | null>(null);
  const [targetIndex, setTarget]     = useState<number | null>(null);
  const draggingIndexSV              = useSharedValue(-1);
  const [saving, setSaving]          = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { setLocalOrder(filteredItems); setDragging(null); setTarget(null); }, [filteredItems]);

  const onDragStart = useCallback((i: number) => { setDragging(i); setTarget(i); }, []);
  const onDragMove  = useCallback((t: number) => setTarget(t), []);
  const commitDrag  = useCallback((from: number, to: number) => {
    if (from !== to) {
      setLocalOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        return next;
      });
    }
    setDragging(null); setTarget(null);
  }, []);

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await reorderMenuItems(localOrder.map((i) => i.id));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
      onSaved();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const title = subCat ? subCat.name : 'No sub-category';

  return (
    <>
      <View style={{ flex: 1 }}>
        <DrillHeader title={title} onBack={onBack} onClose={onClose} />

        <View style={styles.countRow}>
          <Text style={styles.countText}>{localOrder.length} item{localOrder.length !== 1 ? 's' : ''}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {localOrder.length === 0 && (
          <View style={styles.centeredMsg}>
            <Text style={styles.centeredText}>No items here yet.</Text>
          </View>
        )}

        <FlatList
          data={localOrder}
          keyExtractor={(i) => i.id}
          scrollEnabled={draggingIndex === null}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isTargeted = draggingIndex !== null && targetIndex === index && targetIndex !== draggingIndex;
            const isDragDown = draggingIndex !== null && draggingIndex < index;
            return (
              <>
                {isTargeted && !isDragDown && <View style={styles.dropLine} />}
                <ItemDragRow
                  item={item}
                  rowIndex={index}
                  totalCount={localOrder.length}
                  draggingIndexSV={draggingIndexSV}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={commitDrag}
                  onEdit={() => onEditItem?.(item.id)}
                />
                {isTargeted && isDragDown && <View style={styles.dropLine} />}
              </>
            );
          }}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={() => void handleSaveOrder()}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ItemFormModal
        visible={showAddForm}
        categories={categories}
        items={allItems}
        initialCategory={category.name}
        initialSubCategory={subCat?.name}
        onClose={() => setShowAddForm(false)}
      />
    </>
  );
}

// ── Item drag row ─────────────────────────────────────────────────────────────

interface ItemDragRowProps {
  item: MenuItem;
  rowIndex: number;
  totalCount: number;
  draggingIndexSV: SharedValue<number>;
  onDragStart: (i: number) => void;
  onDragMove: (t: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onEdit: () => void;
}

function ItemDragRow({ item, rowIndex, totalCount, draggingIndexSV, onDragStart, onDragMove, onDragEnd, onEdit }: ItemDragRowProps) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onBegin(() => { draggingIndexSV.value = rowIndex; runOnJS(onDragStart)(rowIndex); })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(calcTarget(rowIndex, e.translationY, totalCount, ROW_H));
    })
    .onEnd((e) => {
      const t = calcTarget(rowIndex, e.translationY, totalCount, ROW_H);
      translateY.value = withSpring(0, { duration: 250 });
      draggingIndexSV.value = -1;
      runOnJS(onDragEnd)(rowIndex, t);
    })
    .onFinalize(() => { translateY.value = withSpring(0, { duration: 250 }); draggingIndexSV.value = -1; });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: draggingIndexSV.value === rowIndex ? translateY.value : 0 }],
    zIndex: draggingIndexSV.value === rowIndex ? 100 : 1,
    shadowOpacity: draggingIndexSV.value === rowIndex ? 0.3 : 0,
    elevation: draggingIndexSV.value === rowIndex ? 10 : 0,
    backgroundColor: draggingIndexSV.value === rowIndex ? C.surfaceHigh : 'transparent',
    borderRadius: draggingIndexSV.value === rowIndex ? 10 : 0,
  }));

  return (
    <Animated.View style={[animStyle, { flexDirection: 'row', alignItems: 'center', userSelect: 'none' } as object]}>
      <GestureDetector gesture={pan}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleIcon}>≡</Text>
        </View>
      </GestureDetector>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <Text style={styles.actionEdit}>Edit</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface EditingState { id: string; draft: string; }

export function CategoryEditModal({ visible, categories, items, isLoading, isError, onClose, onEditItem }: CategoryEditModalProps) {
  const queryClient = useQueryClient();
  const [view, setView]               = useState<ModalView>('categories');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<SubCategory | null | 'none'>('none');

  const [localOrder, setLocalOrder] = useState<Category[]>([]);
  const [editing, setEditing]       = useState<EditingState | null>(null);
  const [saving, setSaving]         = useState(false);
  const draggingIndexSV             = useSharedValue(-1);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex]     = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName]   = useState('');
  const [addingCat, setAddingCat]     = useState(false);

  const { data: subCategories = [] } = useSubCategories();

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toastOpacity = useSharedValue(0);
  const toastAnimStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

  const showSavedToast = useCallback(() => {
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1800, withTiming(0, { duration: 300 })),
    );
  }, [toastOpacity]);

  useEffect(() => {
    if (visible) {
      setLocalOrder([...categories]);
      setEditing(null);
      setView('categories');
      setSelectedCat(null);
      setSelectedSubCat('none');
      setShowAddForm(false);
      setNewCatName('');
    }
  }, [visible, categories]);

  const onDragStart = useCallback((i: number) => { setDraggingIndex(i); setTargetIndex(i); }, []);
  const onDragMove  = useCallback((t: number) => setTargetIndex(t), []);
  const commitDrag  = useCallback((from: number, to: number) => {
    if (from !== to) {
      setLocalOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        return next;
      });
    }
    setDraggingIndex(null); setTargetIndex(null);
  }, []);

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
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = (cat: Category) => {
    if (items.some((i) => i.category === cat.name)) {
      Alert.alert('Cannot delete', `"${cat.name}" still has items. Move them first.`); return;
    }
    const doDelete = async () => {
      setSaving(true);
      try {
        await deleteCategory(cat.id);
        setLocalOrder((prev) => prev.filter((c) => c.id !== cat.id));
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      } catch (e) { Alert.alert('Error', (e as Error).message); }
      finally { setSaving(false); }
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

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (localOrder.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `Category "${name}" already exists.`); return;
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
      setNewCatName(''); setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setAddingCat(false); }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await reorderCategories(localOrder.map((c) => c.id));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      showSavedToast();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const openSubCats    = (cat: Category) => { setSelectedCat(cat); setView('subcategories'); };
  const openItems      = (sub: SubCategory | null) => { setSelectedSubCat(sub); setView('items'); };
  const backToCategories = () => { setView('categories'); setSelectedCat(null); };
  const backToSubCats    = () => { setView('subcategories'); setSelectedSubCat('none'); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>

        {view === 'items' && selectedCat ? (
          <ItemsView
            category={selectedCat}
            subCat={selectedSubCat === 'none' ? null : selectedSubCat}
            allItems={items}
            categories={categories}
            onBack={backToSubCats}
            onClose={onClose}
            onSaved={showSavedToast}
            onEditItem={onEditItem}
          />
        ) : view === 'subcategories' && selectedCat ? (
          <SubCatView
            category={selectedCat}
            subCategories={subCategories}
            allCategories={categories}
            items={items}
            onBack={backToCategories}
            onClose={onClose}
            onSaved={showSavedToast}
            onOpenItems={openItems}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Items & Categories Settings</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.countRow}>
              <Text style={styles.countText}>{localOrder.length} categor{localOrder.length !== 1 ? 'ies' : 'y'}</Text>
              {!showAddForm && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
                  <Text style={styles.addBtnText}>+ Add Category</Text>
                </TouchableOpacity>
              )}
            </View>

            {showAddForm && (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder="Category name…"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddCategory()}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.addBtn, (!newCatName.trim() || addingCat) && styles.btnDisabled]}
                  onPress={() => void handleAddCategory()}
                  disabled={!newCatName.trim() || addingCat}
                >
                  {addingCat ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setShowAddForm(false); setNewCatName(''); }}>
                  <Text style={styles.cancelAddBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

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
                const isEditing   = editing?.id === cat.id;
                const itemCount   = items.filter((i) => i.category === cat.name).length;
                const subCatCount = subCategories.filter((s) => s.category === cat.name).length;
                const isTargeted  = draggingIndex !== null && targetIndex === index && targetIndex !== draggingIndex;
                const isDragDown  = draggingIndex !== null && draggingIndex < index;
                return (
                  <>
                    {isTargeted && !isDragDown && <View style={styles.dropLine} />}
                    <CatRow
                      key={cat.id}
                      cat={cat}
                      catIndex={index}
                      totalCount={localOrder.length}
                      draggingIndexSV={draggingIndexSV}
                      isEditing={isEditing}
                      editDraft={isEditing ? (editing?.draft ?? '') : ''}
                      itemCount={itemCount}
                      subCatCount={subCatCount}
                      saving={saving}
                      onDragStart={onDragStart}
                      onDragMove={onDragMove}
                      onDragEnd={commitDrag}
                      onOpenSubCats={() => openSubCats(cat)}
                      onStartEdit={() => setEditing({ id: cat.id, draft: cat.name })}
                      onEditChange={(v) => setEditing((e) => e ? { ...e, draft: v } : e)}
                      onEditSubmit={() => void handleRename()}
                      onEditCancel={() => setEditing(null)}
                      onDelete={() => handleDelete(cat)}
                    />
                    {isTargeted && isDragDown && <View style={styles.dropLine} />}
                  </>
                );
              }}
            />

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={() => void handleSaveOrder()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Success toast — floats above all content */}
        <Animated.View style={[styles.toast, toastAnimStyle]} pointerEvents="none">
          <Text style={styles.toastText}>✓  Saved successfully</Text>
        </Animated.View>
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

  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  subHeaderTitle: { flex: 1, fontSize: 16, fontFamily: FONT.semiBold, color: C.text, textAlign: 'center', marginHorizontal: 8 },
  backBtn:     { paddingHorizontal: 4, paddingVertical: 4 },
  backBtnText: { fontSize: 16, color: C.primary, fontFamily: FONT.semiBold },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  countText: { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },

  addRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  addInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    color: C.text, fontFamily: FONT.regular, fontSize: 14, userSelect: 'none',
  },
  addBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText:       { color: '#fff', fontSize: 13, fontFamily: FONT.semiBold },
  cancelAddBtn:     { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: C.surfaceHigh },
  cancelAddBtnText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  listContent: { padding: 8 },
  dropLine: { height: 2, backgroundColor: C.primary, marginHorizontal: 8, borderRadius: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingRight: 8,
    borderBottomWidth: 1, borderBottomColor: C.border, minHeight: ROW_H,
  },
  dragHandle:     { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  dragHandleIcon: { fontSize: 24, color: C.textMuted, fontFamily: FONT.bold, letterSpacing: 1 },

  nameWrap:  { flex: 1, justifyContent: 'center' },
  catName:   { fontSize: 15, color: C.text, fontFamily: FONT.semiBold },
  catMeta:   { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular, marginTop: 2 },
  nameInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: C.text, fontFamily: FONT.semiBold, fontSize: 15,
  },

  actions:      { flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionBtn:    { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: C.surfaceHigh },
  actionEdit:   { fontSize: 12, color: C.primary, fontFamily: FONT.medium },
  actionSave:   { fontSize: 12, color: C.accent,  fontFamily: FONT.medium },
  actionCancel: { fontSize: 12, color: C.textSub, fontFamily: FONT.medium },
  actionDelete: { fontSize: 12, color: C.error,   fontFamily: FONT.medium },
  actionMove:   { fontSize: 12, color: C.textSub, fontFamily: FONT.medium },

  movePicker: {
    marginHorizontal: 8, marginBottom: 4, marginTop: 2,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  movePickerLabel:      { fontSize: 10, color: C.textMuted, fontFamily: FONT.semiBold, padding: 10, textTransform: 'uppercase', letterSpacing: 1 },
  movePickerOption:     { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  movePickerOptionText: { fontSize: 14, color: C.text, fontFamily: FONT.medium },

  noneRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 14,
    marginTop: 4, borderTopWidth: 1, borderTopColor: C.border,
  },
  noneRowLeft: { flex: 1, paddingLeft: 44 },
  chevron:     { fontSize: 20, color: C.textMuted, paddingRight: 8 },

  itemInfo: {
    flex: 1, paddingVertical: 8, paddingRight: 4,
    minHeight: ROW_H, justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  itemName: { fontSize: 14, color: C.text, fontFamily: FONT.semiBold },

  centeredMsg:  { alignItems: 'center', padding: 32, gap: 10 },
  centeredText: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, textAlign: 'center' },

  footer:      { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn:     { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  btnDisabled: { opacity: 0.5 },

  toast: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: '#1A7A4A', borderRadius: 24,
    paddingHorizontal: 22, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 14, fontFamily: FONT.semiBold },
});
