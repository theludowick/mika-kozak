import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, StyleSheet, Platform, Alert, ActivityIndicator,
} from 'react-native';
import type { Category, MenuItem } from '../../../types/menu';
import { C, FONT } from '../../../constants/theme';

interface BulkActionBarProps {
  selectedCount: number;
  categories: Category[];
  onMoveCategory: (category: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount, categories, onMoveCategory, onDelete, onClear,
}: BulkActionBarProps) {
  const [moveCatOpen, setMoveCatOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading]         = useState(false);

  const handleMoveCategory = async (catName: string) => {
    setLoading(true);
    try {
      await onMoveCategory(catName);
      setMoveCatOpen(false);
      onClear();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== 'DELETE') return;
    setLoading(true);
    try {
      await onDelete();
      setDeleteOpen(false);
      setDeleteInput('');
      onClear();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.bar}>
        <Text style={styles.count}>{selectedCount} selected</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setMoveCatOpen(true)}>
            <Text style={styles.actionBtnText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { setDeleteInput(''); setDeleteOpen(true); }}>
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Move category modal */}
      <Modal visible={moveCatOpen} transparent animationType="fade" onRequestClose={() => setMoveCatOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Move to category</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catRow}
                  onPress={() => void handleMoveCategory(cat.name)}
                  disabled={loading}
                >
                  <Text style={styles.catRowText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setMoveCatOpen(false)} disabled={loading}>
              <Text style={styles.cancelSheetText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}?</Text>
            <Text style={styles.sheetBody}>
              Items will be moved to the Trash and can be recovered later. Type <Text style={styles.deleteKeyword}>DELETE</Text> to confirm.
            </Text>
            <TextInput
              style={[styles.deleteInput, deleteInput === 'DELETE' && styles.deleteInputReady]}
              value={deleteInput}
              onChangeText={setDeleteInput}
              placeholder="Type DELETE"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleteInput !== 'DELETE' && styles.btnDisabled]}
                onPress={() => void handleDelete()}
                disabled={deleteInput !== 'DELETE' || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.deleteConfirmText}>Move to Trash</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setDeleteOpen(false)} disabled={loading}>
                <Text style={styles.cancelSheetText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.primaryMuted, borderTopWidth: 1, borderTopColor: C.borderBright,
  },
  count:   { fontSize: 13, color: C.primary, fontFamily: FONT.semiBold },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.primary,
  },
  actionBtnDanger: { backgroundColor: C.error },
  actionBtnText:   { fontSize: 13, color: '#fff', fontFamily: FONT.semiBold },

  clearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { fontSize: 12, color: C.textSub, fontFamily: FONT.bold },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheet: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 20, width: '100%', maxWidth: 440,
    borderWidth: 1, borderColor: C.border,
  },
  sheetTitle: { fontSize: 17, fontFamily: FONT.semiBold, color: C.text, marginBottom: 12 },
  sheetBody:  { fontSize: 13, color: C.textSub, fontFamily: FONT.regular, lineHeight: 20, marginBottom: 16 },

  catRow:    { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  catRowText:{ fontSize: 14, color: C.text, fontFamily: FONT.medium },

  deleteKeyword: { color: C.error, fontFamily: FONT.bold },
  deleteInput: {
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontFamily: FONT.semiBold, fontSize: 15,
    marginBottom: 16,
  },
  deleteInputReady: { borderColor: C.error },

  sheetActions:    { flexDirection: 'row', gap: 10 },
  deleteConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.error, alignItems: 'center',
  },
  deleteConfirmText: { color: '#fff', fontSize: 14, fontFamily: FONT.semiBold },
  cancelSheetBtn: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  cancelSheetText: { color: C.textSub, fontSize: 14, fontFamily: FONT.medium },
  btnDisabled: { opacity: 0.4 },
});
