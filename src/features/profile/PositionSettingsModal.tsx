import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Switch, ScrollView,
  Modal, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import type { LocationCode } from '../../types/menu';
import { POSITIONS } from '../../types/profile';
import { useHiddenPositions, setPositionHidden } from '../../services/positionSettingsService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { C, FONT } from '../../constants/theme';

interface PositionSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalView = 'locations' | 'positions';

export function PositionSettingsModal({ visible, onClose }: PositionSettingsModalProps) {
  const queryClient = useQueryClient();
  const { data: hiddenSet = new Set<string>(), isLoading } = useHiddenPositions();

  const [view, setView] = useState<ModalView>('locations');
  const [selectedLocation, setSelectedLocation] = useState<LocationCode | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setView('locations');
      setSelectedLocation(null);
    }
  }, [visible]);

  const isHidden = (location: LocationCode, posCode: string) =>
    hiddenSet.has(`${location}:${posCode}`);

  const hiddenCountForLocation = (location: LocationCode) =>
    POSITIONS.filter((p) => hiddenSet.has(`${location}:${p.code}`)).length;

  const handleToggle = async (location: LocationCode, posCode: string) => {
    const key = `${location}:${posCode}`;
    if (togglingKey === key) return;
    setTogglingKey(key);
    try {
      await setPositionHidden(location, posCode, !isHidden(location, posCode));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hiddenPositions });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleBack = () => {
    setView('locations');
    setSelectedLocation(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          {view === 'positions' ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.headerTitle}>
            {view === 'locations'
              ? 'Position Settings'
              : LOCATION_NAMES[selectedLocation!]}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : view === 'locations' ? (
          /* ── Location list ───────────────────────────────────────────────── */
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.hint}>
              Choose a location to show or hide positions in the quiz setup screen.
            </Text>
            <View style={styles.card}>
              {ALL_LOCATIONS.map((loc, i) => {
                const hiddenCount = hiddenCountForLocation(loc);
                const isLast = i === ALL_LOCATIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.locationRow, !isLast && styles.rowDivider]}
                    onPress={() => { setSelectedLocation(loc); setView('positions'); }}
                  >
                    <View style={styles.locationRowInfo}>
                      <Text style={styles.locationName}>{LOCATION_NAMES[loc]}</Text>
                      {hiddenCount > 0 && (
                        <Text style={styles.hiddenBadge}>
                          {hiddenCount} hidden
                        </Text>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          /* ── Position list ───────────────────────────────────────────────── */
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.hint}>
              Toggle OFF to hide a position from the quiz setup at this location.
            </Text>
            <View style={styles.card}>
              {POSITIONS.map((pos, i) => {
                const key = `${selectedLocation!}:${pos.code}`;
                const hidden = isHidden(selectedLocation!, pos.code);
                const isToggling = togglingKey === key;
                const isLast = i === POSITIONS.length - 1;
                return (
                  <View key={pos.code} style={[styles.positionRow, !isLast && styles.rowDivider]}>
                    <Text style={[styles.positionName, hidden && styles.positionNameHidden]}>
                      {pos.name}
                    </Text>
                    {isToggling ? (
                      <ActivityIndicator size="small" color={C.primary} style={{ width: 51 }} />
                    ) : (
                      <Switch
                        value={!hidden}
                        onValueChange={() => void handleToggle(selectedLocation!, pos.code)}
                        trackColor={{ false: C.border, true: C.primary }}
                        thumbColor="#fff"
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
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
  headerTitle: { fontSize: 17, fontFamily: FONT.semiBold, color: C.text, flex: 1, textAlign: 'center' },
  backBtn:     { width: 60 },
  backBtnText: { fontSize: 15, color: C.primary, fontFamily: FONT.medium },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:{ fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  hint: {
    fontSize: 13, color: C.textMuted, fontFamily: FONT.regular,
    lineHeight: 19, marginBottom: 16,
  },

  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },

  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  locationRowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationName:   { fontSize: 15, fontFamily: FONT.regular, color: C.text },
  hiddenBadge: {
    fontSize: 11, fontFamily: FONT.medium, color: C.error,
    backgroundColor: C.errorMuted, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  chevron: { fontSize: 18, color: C.textMuted },

  positionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  positionName:       { fontSize: 15, fontFamily: FONT.regular, color: C.text },
  positionNameHidden: { color: C.textMuted },
});
