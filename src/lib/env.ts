import Constants from 'expo-constants';

export const ENV = {
  SUPABASE_URL:      process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appVersion:        Constants.expoConfig?.version             ?? '1.0.0',
} as const;
