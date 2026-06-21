import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';
import type { QuizFilters, QuizResults } from '../types/quiz';

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found
    throw error;
  }
  return data as Profile;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Quiz attempts ────────────────────────────────────────────────────────────

export async function saveQuizAttempt(
  userId: string,
  results: QuizResults,
  filters: QuizFilters,
): Promise<string> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      score: results.score,
      correct_count: results.correctCount,
      incorrect_count: results.incorrectCount,
      total_questions: results.totalQuestions,
      filters,
    })
    .select('id')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

// ── Menu progress ────────────────────────────────────────────────────────────

export async function markMenuItemLearned(userId: string, menuItemId: string): Promise<void> {
  const { error } = await supabase.from('menu_item_progress').upsert({
    user_id: userId,
    menu_item_id: menuItemId,
    viewed_at: new Date().toISOString(),
    marked_learned: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function recordMenuItemView(userId: string, menuItemId: string): Promise<void> {
  const { error } = await supabase.from('menu_item_progress').upsert({
    user_id: userId,
    menu_item_id: menuItemId,
    viewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
