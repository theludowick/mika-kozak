import type { QuestionFormat, QuizOption } from '../types/quiz';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
type Letter = (typeof LETTERS)[number];

/**
 * Parse the Correct field into a set of 0-based indices into OptionA..D.
 *
 * Handles:
 *   - Single letter  → "A", "b", " C "
 *   - Multiple letters for CM  → "A,C" or "A;C"
 *   - Full answer text  → "Pinot Noir" (returns empty; caller must handle)
 *   - True/False  → "True", "False" (treated as A/B respectively when options are present)
 *   - Blank OA  → returns []
 *
 * Returns a sorted array of 0-based indices. Empty array means the caller
 * cannot auto-grade (open answer or text-only correct value).
 */
export function parseCorrectIndices(correctRaw: string | undefined): number[] {
  const val = (correctRaw ?? '').trim();
  if (!val) return [];

  const tokens = val
    .toUpperCase()
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const indices: number[] = [];
  for (const token of tokens) {
    const idx = LETTERS.indexOf(token as Letter);
    if (idx !== -1) indices.push(idx);
  }

  // If we matched at least one letter, return those indices.
  if (indices.length > 0) return [...new Set(indices)].sort();

  // Fallback for True/False: treat "TRUE" → index 0, "FALSE" → index 1.
  if (tokens[0] === 'TRUE') return [0];
  if (tokens[0] === 'FALSE') return [1];

  // Full answer text — cannot map to an index, caller handles as open answer.
  return [];
}

/**
 * Build the shuffled options array for a multiple-choice question.
 * Shuffling is done once at parse time so rerenders don't change the order.
 *
 * Returns null for OA format or when no options exist.
 */
export function buildShuffledOptions(
  rawOptions: Array<string | undefined>,
  correctIndicesInOriginal: number[],
): QuizOption[] | null {
  const nonEmpty: Array<{ text: string; isCorrect: boolean }> = [];

  rawOptions.forEach((opt, i) => {
    const text = (opt ?? '').trim();
    if (text) nonEmpty.push({ text, isCorrect: correctIndicesInOriginal.includes(i) });
  });

  if (nonEmpty.length === 0) return null;

  // Fisher-Yates shuffle using explicit temp to avoid any destructuring edge cases
  const shuffled = [...nonEmpty];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const swap = shuffled[j];
    if (temp !== undefined && swap !== undefined) {
      shuffled[i] = swap;
      shuffled[j] = temp;
    }
  }

  return shuffled;
}

/**
 * Normalise a string for safe comparison:
 * trim, lowercase, collapse internal whitespace.
 */
export function normaliseForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Infer the format code from a raw string.
 * Returns 'OA' as the safe fallback for unknown values.
 */
export function parseFormat(raw: string | undefined): QuestionFormat {
  const upper = (raw ?? '').trim().toUpperCase();
  if (upper === 'CS' || upper === 'CM' || upper === 'CI') return upper;
  return 'OA';
}

/**
 * Returns true if the row's Status field indicates an active question.
 * Active = "published" (case-insensitive, whitespace-trimmed).
 */
export function isActiveQuestion(status: string | undefined): boolean {
  return (status ?? '').trim().toLowerCase() === 'published';
}
