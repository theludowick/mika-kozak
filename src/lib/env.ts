import Constants from 'expo-constants';

export const ENV = {
  SUPABASE_URL:     process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  QUIZ_CSV_URL:     process.env.EXPO_PUBLIC_QUIZ_CSV_URL     ?? '',
  MENU_CSV_URL:     process.env.EXPO_PUBLIC_MENU_CSV_URL     ?? '',
  appVersion:       Constants.expoConfig?.version            ?? '1.0.0',
} as const;
