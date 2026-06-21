import Constants from 'expo-constants';

function getEnv(key: string): string {
  // Expo public env vars are available on process.env in all environments
  const value = process.env[key];
  if (!value) {
    if (__DEV__) {
      console.warn(`[env] Missing environment variable: ${key}`);
    }
    return '';
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  QUIZ_CSV_URL: getEnv('EXPO_PUBLIC_QUIZ_CSV_URL'),
  MENU_CSV_URL: getEnv('EXPO_PUBLIC_MENU_CSV_URL'),
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
} as const;
