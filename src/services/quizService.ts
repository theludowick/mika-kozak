import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { ParsedQuestion, MultipleChoiceQuestion, OpenAnswerQuestion } from '../types/quiz';
import type { LocationCode } from '../types/menu';
import { ALL_LOCATIONS } from '../types/menu';
import { parseCorrectIndices, buildShuffledOptions, parseFormat } from '../utils/quizNormalizer';
import { normaliseImageUrl } from '../utils/imageUtils';

interface QuizRow {
  id: string;
  format: string;
  topics: string[];
  positions: string[];
  locations: string[];
  item: string;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct: string | null;
  model_answer: string | null;
  image_url: string | null;
}

function parseRow(row: QuizRow): ParsedQuestion | null {
  const format = parseFormat(row.format);

  const base = {
    id: row.id,
    format,
    topics: row.topics ?? [],
    positions: row.positions ?? [],
    locations: (row.locations ?? []).filter(
      (l): l is LocationCode => ALL_LOCATIONS.includes(l as LocationCode),
    ),
    item: row.item ?? '',
    question: row.question ?? '',
    imageUrl: normaliseImageUrl(row.image_url ?? undefined),
  };

  if (format === 'CS' || format === 'CM' || format === 'CI') {
    const correctIndices = parseCorrectIndices(row.correct ?? undefined);
    const options = buildShuffledOptions(
      [row.option_a ?? undefined, row.option_b ?? undefined, row.option_c ?? undefined, row.option_d ?? undefined],
      correctIndices,
    );
    if (!options) return null;
    return { ...base, format, options } satisfies MultipleChoiceQuestion;
  }

  return {
    ...base,
    format: 'OA',
    modelAnswer: row.model_answer ?? '',
  } satisfies OpenAnswerQuestion;
}

async function fetchQuizQuestions(): Promise<ParsedQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, format, topics, positions, locations, item, question, option_a, option_b, option_c, option_d, correct, model_answer, image_url')
    .eq('status', 'published');

  if (error) throw new Error(error.message);

  const questions: ParsedQuestion[] = [];
  for (const row of data ?? []) {
    const q = parseRow(row as QuizRow);
    if (q) questions.push(q);
  }
  return questions;
}

export function useQuizQuestions() {
  return useQuery({
    queryKey: QUERY_KEYS.quizQuestions,
    queryFn: fetchQuizQuestions,
    staleTime: 1000 * 60 * 15,
  });
}
