import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Alert, StyleSheet,
  Platform, FlatList, ActivityIndicator, ScrollView,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, withSpring, runOnJS, useAnimatedStyle,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, MenuItem } from '../../../types/menu';
import { reorderMenuItems } from '../../../services/menuService';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { ItemFormModal } from './ItemFormModal';
import { C, FONT } from '../../../constants/theme';

interface ItemsManagementModalProps {
  visible: boolean;
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
  onEditItem: (itemId: string) => void;
}

const ROW_H = 58;

function calcTarget(idx: number, dy: number, total: number) {
  const raw = Math.round(idx + dy / ROW_H);
  const movingDown = dy > 0 && raw > idx;
  return Math.max(0, Math.min(total - 1, movingDown ? raw + 1 : raw));
}

export function ItemsManagementModal({ visible, categories, items, onClose, onEditItem }: ItemsManagementModalProps) {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState('');
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [localOrder, setLocalOrder]  = useState<MenuItem[]>([]);
  const [draggingIndex, setDragging] = useState<number | null>(null);
  const [targetIndex, setTarget]     = useState<number | null>(null);
  const draggingIndexSV              = useSharedValue(-1);
  const [saving, setSaving]          = useState(false);

  const catItems = useMemo(
    () => items.filter((i) => i.category === selectedCat),
    [items, selectedCat],
  );

  useEffect(() => {
    if (visible && categories.length > 0) {
      setSelectedCat((prev) => prev || categories[0]?.name || '');
    }
  }, [visible, categories]);

  useEffect(() => { setLocalOrder(catItems); setDragging(null); setTarget(null); }, [catItems]);

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
      onClose();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.root}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Items Management</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Category picker */}
          <View style={styles.catWrap}>
            <TouchableOpacity style={styles.catTrigger} onPress={() => setCatPickerOpen((v) => !v)}>
              <Text style={styles.catTriggerValue}>{selectedCat || 'Select category…'}</Text>
              <Text style={styles.catTriggerArrow}>{catPickerOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {catPickerOpen && (
              <ScrollView style={styles.catDropdown} nestedScrollEnabled>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catOption, cat.name === selectedCat && styles.catOptionActive]}
                    onPress={() => { setSelectedCat(cat.name); setCatPickerOpen(false); }}
                  >
                    <Text style={[styles.catOptionText, cat.name === selectedCat && styles.catOptionTextActive]}>{cat.name}</Text>
                    {cat.name === selectedCat && <Text style={styles.catCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Count + Add button */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>{localOrder.length} item{localOrder.length !== 1 ? 's' : ''}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
              <Text style={styles.addBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {localOrder.length === 0 && (
            <View style={styles.centeredMsg}>
              <Text style={styles.centeredText}>No items in this category.</Text>
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
                  <ItemRow
                    item={item}
                    rowIndex={index}
                    totalCount={localOrder.length}
                    draggingIndexSV={draggingIndexSV}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={commitDrag}
                    onEdit={() => { onClose(); onEditItem(item.id); }}
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
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Order & Close</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ItemFormModal
        visible={showAddForm}
        categories={categories}
        items={items}
        onClose={() => setShowAddForm(false)}
      />
    </>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MenuItem;
  rowIndex: number;
  totalCount: number;
  draggingIndexSV: ReturnType<typeof useSharedValue<number>>;
  onDragStart: (i: number) => void;
  onDragMove: (t: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onEdit: () => void;
}

function ItemRow({ item, rowIndex, totalCount, draggingIndexSV, onDragStart, onDragMove, onDragEnd, onEdit }: ItemRowProps) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onBegin(() => { draggingIndexSV.value = rowIndex; runOnJS(onDragStart)(rowIndex); })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(calcTarget(rowIndex, e.translationY, totalCount));
    })
    .onEnd((e) => {
      const t = calcTarget(rowIndex, e.translationY, totalCount);
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
        {!!item.subCategory && <Text style={styles.itemSub}>{item.subCategory}</Text>}
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <Text style={styles.actionEdit}>Edit</Text>
      </TouchableOpacity>
    </Animated.View>
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

  catWrap: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  catTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  catTriggerValue: { fontSize: 14, color: C.text, fontFamily: FONT.semiBold, flex: 1 },
  catTriggerArrow: { fontSize: 10, color: C.textMuted, marginLeft: 8 },
  catDropdown: {
    marginTop: 4, borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 10, backgroundColor: C.surface, maxHeight: 200,
  },
  catOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  catOptionActive:     { backgroundColor: C.primaryMuted },
  catOptionText:       { fontSize: 14, color: C.text, fontFamily: FONT.regular },
  catOptionTextActive: { color: C.primary, fontFamily: FONT.semiBold },
  catCheck:            { fontSize: 13, color: C.primary, fontFamily: FONT.bold },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  countText: { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },
  addBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.primary },
  addBtnText:{ color: '#fff', fontSize: 13, fontFamily: FONT.semiBold },

  listContent: { padding: 8 },
  dropLine: { height: 2, backgroundColor: C.primary, marginHorizontal: 8, borderRadius: 1 },

  dragHandle:     { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  dragHandleIcon: { fontSize: 22, color: C.textMuted, fontFamily: FONT.bold, letterSpacing: 1 },

  itemInfo: {
    flex: 1, paddingVertical: 8, paddingRight: 4,
    minHeight: ROW_H, justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  itemName: { fontSize: 14, color: C.text, fontFamily: FONT.semiBold },
  itemSub:  { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular, marginTop: 1 },

  actionBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: C.surfaceHigh, marginLeft: 6, marginRight: 4 },
  actionEdit: { fontSize: 12, color: C.primary, fontFamily: FONT.medium },

  centeredMsg:  { alignItems: 'center', padding: 32 },
  centeredText: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular, textAlign: 'center' },

  footer:      { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn:     { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  btnDisabled: { opacity: 0.5 },
});
