import { z } from 'zod';

// ── Raw CSV row schema ──────────────────────────────────────────────────────

export const QuizRowSchema = z.object({
  ID: z.string().optional(),
  Format: z.string(),
  Topics: z.string().optional(),
  Positions: z.string().optional(),
  Location: z.string().optional(),
  Item: z.string().optional(),
  Question: z.string().optional(),
  OptionA: z.string().optional(),
  OptionB: z.string().optional(),
  OptionC: z.string().optional(),
  OptionD: z.string().optional(),
  Correct: z.string().optional(),
  ModelAnswer: z.string().optional(),
  Image: z.string().optional(),
  Status: z.string(),
});

export type QuizRow = z.infer<typeof QuizRowSchema>;

// ── Question formats ────────────────────────────────────────────────────────

export type QuestionFormat = 'CS' | 'CM' | 'CI' | 'OA';

export const FORMAT_LABELS: Record<QuestionFormat, string> = {
  CS: 'Choose One',
  CM: 'Choose Multiple',
  CI: 'Choose the Incorrect',
  OA: 'Open Answer',
};

// ── Parsed question (used at runtime) ──────────────────────────────────────

export interface QuizOption {
  text: string;
  /** Whether this option is a correct answer */
  isCorrect: boolean;
}

export interface BaseQuestion {
  id: string;
  format: QuestionFormat;
  topics: string[];
  positions: string[];
  locations: string[];
  item: string;
  question: string;
  imageUrl: string | null;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  format: 'CS' | 'CM' | 'CI';
  /** Options with correct flags — already shuffled at parse time */
  options: QuizOption[];
}

export interface OpenAnswerQuestion extends BaseQuestion {
  format: 'OA';
  modelAnswer: string;
}

export type ParsedQuestion = MultipleChoiceQuestion | OpenAnswerQuestion;

// ── Session types ───────────────────────────────────────────────────────────

export type AnswerState =
  | { status: 'unanswered' }
  | { status: 'answered_mc'; selectedIndices: number[]; isCorrect: boolean }
  | { status: 'answered_open'; writtenAnswer: string; revealed: boolean }
  | { status: 'skipped' };

export interface QuizSession {
  sessionId: string;
  questions: ParsedQuestion[];
  currentIndex: number;
  answers: AnswerState[];
  startedAt: string;
  completedAt: string | null;
  filters: QuizFilters;
}

export interface QuizFilters {
  topics: string[];
  positions: string[];
  locations: string[];
  item: string;
  randomizeOrder: boolean;
}

export interface QuizResults {
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  score: number;
  incorrectIndices: number[];
}
