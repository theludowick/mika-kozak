import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationCode } from '../types/menu';

const STORAGE_KEY = 'selected_location';

/**
 * Persists the user's selected location to AsyncStorage.
 * Default is 'GT' (Gastown) matching the HTML app's default.
 */
export function useSelectedLocation() {
  const [location, setLocationState] = useState<LocationCode>('GT');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setLocationState(stored as LocationCode);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const setLocation = useCallback((loc: LocationCode) => {
    setLocationState(loc);
    AsyncStorage.setItem(STORAGE_KEY, loc).catch((e) => {
      if (__DEV__) console.warn('[useSelectedLocation] storage error', e);
    });
  }, []);

  return { location, setLocation, isLoaded };
}
