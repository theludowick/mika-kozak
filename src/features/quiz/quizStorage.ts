import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuizSession } from '../../types/quiz';

const KEY = 'quiz_session_in_progress';

export async function saveSession(session: QuizSession): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    if (__DEV__) console.warn('[quizStorage] save failed', e);
  }
}

export async function loadSession(): Promise<QuizSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizSession;
  } catch (e) {
    if (__DEV__) console.warn('[quizStorage] load failed', e);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
