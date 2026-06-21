import { useState, useCallback, useEffect } from 'react';
import type {
  ParsedQuestion,
  QuizFilters,
  QuizSession,
  AnswerState,
  QuizResults,
  MultipleChoiceQuestion,
} from '../../types/quiz';
import { saveSession, loadSession, clearSession } from './quizStorage';

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    const swap = a[j];
    if (temp !== undefined && swap !== undefined) {
      a[i] = swap;
      a[j] = temp;
    }
  }
  return a;
}

function buildPool(questions: ParsedQuestion[], filters: QuizFilters): ParsedQuestion[] {
  let pool = [...questions];

  if (filters.topics.length > 0) {
    pool = pool.filter((q) => q.topics.some((t) => filters.topics.includes(t)));
  }
  if (filters.positions.length > 0) {
    pool = pool.filter(
      (q) => q.positions.length === 0 || q.positions.some((p) => filters.positions.includes(p)),
    );
  }
  if (filters.locations.length > 0) {
    pool = pool.filter(
      (q) => q.locations.length === 0 || q.locations.some((l) => filters.locations.includes(l)),
    );
  }
  if (filters.item) {
    pool = pool.filter((q) => q.item.toLowerCase().includes(filters.item.toLowerCase()));
  }

  return filters.randomizeOrder ? shuffle(pool) : pool;
}

function computeResults(session: QuizSession): QuizResults {
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  const incorrectIndices: number[] = [];

  session.answers.forEach((ans, i) => {
    if (ans.status === 'unanswered' || ans.status === 'skipped') {
      skippedCount++;
    } else if (ans.status === 'answered_mc') {
      if (ans.isCorrect) correctCount++;
      else {
        incorrectCount++;
        incorrectIndices.push(i);
      }
    } else if (ans.status === 'answered_open') {
      // OA is not auto-graded; count revealed answers as "answered"
    }
  });

  const answered = correctCount + incorrectCount;
  const score = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;

  return {
    totalQuestions: session.questions.length,
    answeredQuestions: answered,
    correctCount,
    incorrectCount,
    skippedCount,
    score,
    incorrectIndices,
  };
}

export function useQuizSession() {
  const [session, setSession] = useState<QuizSession | null>(null);

  // Attempt to restore an in-progress session on mount
  useEffect(() => {
    loadSession().then((saved) => {
      if (saved && !saved.completedAt) {
        setSession(saved);
      }
    });
  }, []);

  const startSession = useCallback(
    (allQuestions: ParsedQuestion[], filters: QuizFilters) => {
      const pool = buildPool(allQuestions, filters);
      const newSession: QuizSession = {
        sessionId: generateId(),
        questions: pool,
        currentIndex: 0,
        answers: pool.map(() => ({ status: 'unanswered' })),
        startedAt: new Date().toISOString(),
        completedAt: null,
        filters,
      };
      setSession(newSession);
      void saveSession(newSession);
    },
    [],
  );

  const persistAndSet = useCallback((updated: QuizSession) => {
    setSession(updated);
    void saveSession(updated);
  }, []);

  const answerMC = useCallback(
    (selectedIndices: number[]) => {
      if (!session) return;
      const q = session.questions[session.currentIndex] as MultipleChoiceQuestion | undefined;
      if (!q) return;

      const correctSet = new Set(q.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1));
      const selectedSet = new Set(selectedIndices);
      const isCorrect =
        correctSet.size === selectedSet.size && [...correctSet].every((i) => selectedSet.has(i));

      const newAnswers = [...session.answers];
      newAnswers[session.currentIndex] = { status: 'answered_mc', selectedIndices, isCorrect };

      persistAndSet({ ...session, answers: newAnswers });
    },
    [session, persistAndSet],
  );

  const revealOpenAnswer = useCallback(
    (writtenAnswer: string) => {
      if (!session) return;
      const newAnswers = [...session.answers];
      newAnswers[session.currentIndex] = {
        status: 'answered_open',
        writtenAnswer,
        revealed: true,
      };
      persistAndSet({ ...session, answers: newAnswers });
    },
    [session, persistAndSet],
  );

  const skipQuestion = useCallback(() => {
    if (!session) return;
    const newAnswers = [...session.answers];
    newAnswers[session.currentIndex] = { status: 'skipped' };
    persistAndSet({ ...session, answers: newAnswers });
  }, [session, persistAndSet]);

  const goToNext = useCallback(() => {
    if (!session) return;
    const next = session.currentIndex + 1;
    if (next >= session.questions.length) {
      const completed = {
        ...session,
        completedAt: new Date().toISOString(),
        currentIndex: next,
      };
      persistAndSet(completed);
    } else {
      persistAndSet({ ...session, currentIndex: next });
    }
  }, [session, persistAndSet]);

  const goToPrev = useCallback(() => {
    if (!session || session.currentIndex === 0) return;
    persistAndSet({ ...session, currentIndex: session.currentIndex - 1 });
  }, [session, persistAndSet]);

  const endSession = useCallback(async () => {
    setSession(null);
    await clearSession();
  }, []);

  const isComplete = session
    ? session.currentIndex >= session.questions.length || session.completedAt !== null
    : false;

  const results = session ? computeResults(session) : null;

  return {
    session,
    isComplete,
    results,
    startSession,
    answerMC,
    revealOpenAnswer,
    skipQuestion,
    goToNext,
    goToPrev,
    endSession,
  };
}
