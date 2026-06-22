import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationCode } from '../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../types/menu';
import { useAuth } from '../features/auth/AuthContext';
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

  const { session } = useAuth();

  if (!isLoaded) return null;

  // Don't block with the location prompt until the user is signed in
  if (location === null && !session) {
    return <>{children}</>;
  }

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

// ── Header button + picker modal ──────────────────────────────────────────────

export function LocationHeaderButton() {
  const { location, setLocation } = useLocation();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Current location: ${LOCATION_NAMES[location]}. Tap to change.`}
      >
        <Text style={styles.headerBtnName}>{LOCATION_NAMES[location]}</Text>
        <Text style={styles.headerBtnChevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Location</Text>

            {ALL_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.modalOption, loc === location && styles.modalOptionActive]}
                onPress={() => { setLocation(loc); setOpen(false); }}
                accessibilityRole="button"
              >
                <Text style={[styles.modalOptionName, loc === location && styles.modalOptionNameActive]}>
                  {LOCATION_NAMES[loc]}
                </Text>
                {loc === location && <Text style={styles.modalCheck}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => { setOpen(false); void signOut(); }}
              accessibilityRole="button"
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
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
  modalOptionName: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: C.text,
  },
  modalOptionNameActive: { color: C.primary },
  modalCheck: { fontSize: 14, color: C.primary, fontFamily: FONT.bold },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  signOutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: C.textSub,
  },

  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.primaryMuted,
    marginRight: 12,
  },
  headerBtnName: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: C.primary,
  },
  headerBtnChevron: {
    fontSize: 10,
    color: C.primary,
  },
});
