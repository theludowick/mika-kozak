import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationCode } from '../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../types/menu';
import { C, FONT } from '../constants/theme';

const STORAGE_KEY = 'selected_location';

interface LocationContextValue {
  location: LocationCode;
  setLocation: (loc: LocationCode) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationCode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && ALL_LOCATIONS.includes(stored as LocationCode)) {
          setLocationState(stored as LocationCode);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (isLoaded && location === null) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [isLoaded, location, fadeAnim]);

  const setLocation = useCallback((loc: LocationCode) => {
    setLocationState(loc);
    AsyncStorage.setItem(STORAGE_KEY, loc).catch(() => undefined);
  }, []);

  // Block render until AsyncStorage has been checked
  if (!isLoaded) return null;

  // First-open: location picker modal (no dismiss, must choose)
  if (location === null) {
    return (
      <Animated.View style={[styles.firstRunWrap, { opacity: fadeAnim }]}>
        <View style={styles.firstRunCard}>
          <Text style={styles.firstRunTitle}>Welcome to Kozak Training Hub</Text>
          <Text style={styles.firstRunSub}>Which location are you training for?</Text>
          <View style={styles.firstRunOptions}>
            {ALL_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={styles.firstRunOption}
                onPress={() => setLocation(loc)}
                accessibilityRole="button"
                accessibilityLabel={LOCATION_NAMES[loc]}
              >
                <Text style={styles.firstRunCode}>{loc}</Text>
                <Text style={styles.firstRunName}>{LOCATION_NAMES[loc]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>');
  return ctx;
}

// ── Location picker modal (used from the header button) ──────────────────────

interface LocationPickerModalProps {
  visible: boolean;
  current: LocationCode;
  onSelect: (loc: LocationCode) => void;
  onClose: () => void;
}

export function LocationPickerModal({ visible, current, onSelect, onClose }: LocationPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <Text style={styles.modalTitle}>Switch Location</Text>
          {ALL_LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.modalOption, loc === current && styles.modalOptionActive]}
              onPress={() => { onSelect(loc); onClose(); }}
              accessibilityRole="button"
            >
              <View style={styles.modalOptionLeft}>
                <Text style={[styles.modalOptionCode, loc === current && styles.modalOptionCodeActive]}>
                  {loc}
                </Text>
                <Text style={[styles.modalOptionName, loc === current && styles.modalOptionNameActive]}>
                  {LOCATION_NAMES[loc]}
                </Text>
              </View>
              {loc === current && <Text style={styles.modalCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Header button ─────────────────────────────────────────────────────────────

export function LocationHeaderButton() {
  const { location, setLocation } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Current location: ${LOCATION_NAMES[location]}. Tap to change.`}
      >
        <Text style={styles.headerBtnCode}>{location}</Text>
        <Text style={styles.headerBtnChevron}>▾</Text>
      </TouchableOpacity>

      <LocationPickerModal
        visible={open}
        current={location}
        onSelect={setLocation}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  firstRunWrap: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  firstRunCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  firstRunTitle: {
    fontSize: 20,
    fontFamily: FONT.extraBold,
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  firstRunSub: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 28,
  },
  firstRunOptions: { gap: 10 },
  firstRunOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
  },
  firstRunCode: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: C.primary,
    width: 32,
    textAlign: 'center',
  },
  firstRunName: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: C.text,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: FONT.semiBold,
    color: C.textMuted,
    marginBottom: 14,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.borderBright,
  },
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalOptionCode: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: C.textMuted,
    width: 30,
    textAlign: 'center',
  },
  modalOptionCodeActive: { color: C.primary },
  modalOptionName: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: C.text,
  },
  modalOptionNameActive: { color: C.primary },
  modalCheck: { fontSize: 14, color: C.primary, fontFamily: FONT.bold },

  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.primaryMuted,
    marginRight: 12,
  },
  headerBtnCode: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: C.primary,
  },
  headerBtnChevron: {
    fontSize: 10,
    color: C.primary,
  },
});
