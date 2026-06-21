import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchCSV } from './csvService';
import { ENV } from '../lib/env';
import { QUERY_KEYS } from '../constants/queryKeys';
import { QuizRowSchema } from '../types/quiz';
import type { ParsedQuestion, MultipleChoiceQuestion, OpenAnswerQuestion } from '../types/quiz';
import {
  parseCorrectIndices,
  buildShuffledOptions,
  parseFormat,
  isActiveQuestion,
} from '../utils/quizNormalizer';
import { splitDelimited } from '../utils/csvParser';
import { parseLocations } from '../utils/locationParser';
import { normaliseImageUrl } from '../utils/imageUtils';
import { generateRowId } from '../utils/idGenerator';

function normaliseHeader(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '');
}

/**
 * Map a raw CSV row (any casing) to the canonical QuizRow shape.
 * Handles headers like "OptionA", "optiona", "option_a" gracefully.
 */
function canonicaliseRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const norm = normaliseHeader(key);
    // Map known variant spellings to canonical keys
    const canonical = HEADER_MAP[norm] ?? key;
    out[canonical] = val;
  }
  return out;
}

const HEADER_MAP: Record<string, string> = {
  id: 'ID',
  format: 'Format',
  topics: 'Topics',
  positions: 'Positions',
  location: 'Location',
  item: 'Item',
  question: 'Question',
  optiona: 'OptionA',
  optionb: 'OptionB',
  optionc: 'OptionC',
  optiond: 'OptionD',
  correct: 'Correct',
  modelanswer: 'ModelAnswer',
  image: 'Image',
  status: 'Status',
};

function parseRow(raw: Record<string, string>, rowIndex: number): ParsedQuestion | null {
  const canonical = canonicaliseRow(raw);
  const parsed = QuizRowSchema.safeParse(canonical);

  if (!parsed.success) {
    if (__DEV__) {
      console.warn(`[quizService] Row ${rowIndex} validation failed:`, parsed.error.issues[0]);
    }
    return null;
  }

  const row = parsed.data;

  if (!isActiveQuestion(row.Status)) return null;

  const format = parseFormat(row.Format);
  const id =
    row.ID?.trim() ||
    generateRowId([row.Format ?? '', row.Question ?? '', row.Item ?? '', String(rowIndex)]);

  const base = {
    id,
    format,
    topics: splitDelimited(row.Topics),
    positions: splitDelimited(row.Positions).map((p) => p.toLowerCase()),
    locations: parseLocations(row.Location),
    item: (row.Item ?? '').trim(),
    question: (row.Question ?? row.Item ?? '').trim(),
    imageUrl: normaliseImageUrl(row.Image),
  };

  if (format === 'CS' || format === 'CM' || format === 'CI') {
    const rawOpts = [row.OptionA, row.OptionB, row.OptionC, row.OptionD];
    const correctIndices = parseCorrectIndices(row.Correct);
    const options = buildShuffledOptions(rawOpts, correctIndices);

    if (!options) return null;

    return { ...base, format, options } satisfies MultipleChoiceQuestion;
  }

  return {
    ...base,
    format: 'OA',
    modelAnswer: (row.ModelAnswer ?? '').trim(),
  } satisfies OpenAnswerQuestion;
}

async function fetchQuizQuestions(): Promise<ParsedQuestion[]> {
  const { data } = await fetchCSV(ENV.QUIZ_CSV_URL);
  const questions: ParsedQuestion[] = [];

  data.forEach((row, i) => {
    const q = parseRow(row, i + 1);
    if (q) questions.push(q);
  });

  return questions;
}

export function useQuizQuestions() {
  return useQuery({
    queryKey: QUERY_KEYS.quizQuestions,
    queryFn: fetchQuizQuestions,
    staleTime: 1000 * 60 * 15,
  });
}
