import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../../src/constants/theme';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useQuizSession } from '../../src/features/quiz/useQuizSession';
import { QuizSetupScreen } from '../../src/features/quiz/QuizSetupScreen';
import { QuizQuestionScreen } from '../../src/features/quiz/QuizQuestionScreen';
import { QuizResultsScreen } from '../../src/features/quiz/QuizResultsScreen';
import type { ParsedQuestion, QuizFilters } from '../../src/types/quiz';

export default function QuizTab() {
  const {
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
  } = useQuizSession();

  const handleStart = (questions: ParsedQuestion[], filters: QuizFilters) => {
    startSession(questions, filters);
  };

  const handleNewRound = async () => {
    await endSession();
  };

  const handleChangeTopics = async () => {
    await endSession();
  };

  // No active session → show setup
  if (!session) {
    return (
      <View style={styles.root}>
        <QuizSetupScreen onStart={handleStart} />
      </View>
    );
  }

  // Session complete → show results
  if (isComplete && results) {
    return (
      <View style={styles.root}>
        <QuizResultsScreen
          session={session}
          results={results}
          onNewRound={handleNewRound}
          onChangeTopics={handleChangeTopics}
        />
      </View>
    );
  }

  // Active session → show question
  const currentQuestion = session.questions[session.currentIndex];
  if (!currentQuestion) return null;

  const currentAnswer = session.answers[session.currentIndex] ?? { status: 'unanswered' };
  const correctCount = session.answers.filter(
    (a) => a.status === 'answered_mc' && a.isCorrect,
  ).length;
  const answeredCount = session.answers.filter(
    (a) => a.status === 'answered_mc' || a.status === 'answered_open',
  ).length;

  return (
    <View style={styles.root}>
      <QuizQuestionScreen
        question={currentQuestion}
        questionNumber={session.currentIndex + 1}
        totalQuestions={session.questions.length}
        correctCount={correctCount}
        answeredCount={answeredCount}
        answerState={currentAnswer}
        hasPrev={session.currentIndex > 0}
        onAnswerMC={answerMC}
        onRevealOpen={revealOpenAnswer}
        onSkip={skipQuestion}
        onNext={goToNext}
        onPrev={goToPrev}
        onExit={() => void endSession()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});
