import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { QuizResults, QuizSession } from '../../types/quiz';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface QuizResultsScreenProps {
  session: QuizSession;
  results: QuizResults;
  onNewRound: () => void;
  onChangeTopics: () => void;
}

export function QuizResultsScreen({
  session,
  results,
  onNewRound,
  onChangeTopics,
}: QuizResultsScreenProps) {
  const { score, correctCount, incorrectCount, skippedCount, totalQuestions, incorrectIndices } =
    results;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Card style={styles.summaryCard}>
        <Text style={styles.icon}>🌻</Text>
        <Text style={styles.title}>Round Complete</Text>
        <Text style={styles.subtitle}>{totalQuestions} questions this round</Text>
        <Text style={styles.score}>{score}%</Text>
        <Text style={styles.detail}>
          {correctCount} correct · {incorrectCount} incorrect · {skippedCount} skipped
        </Text>

        <View style={styles.btnRow}>
          <Button label="New Round" onPress={onNewRound} />
          <Button label="Change Topics" onPress={onChangeTopics} variant="ghost" />
        </View>
      </Card>

      {/* Review incorrect answers */}
      {incorrectIndices.length > 0 && (
        <>
          <Text style={styles.reviewLabel}>Review Incorrect Answers</Text>
          {incorrectIndices.map((qi) => {
            const q = session.questions[qi];
            const ans = session.answers[qi];
            if (!q || !ans || ans.status !== 'answered_mc') return null;

            const correctOptions =
              q.format !== 'OA'
                ? (q as Extract<typeof q, { format: 'CS' | 'CM' | 'CI' }>).options
                    .filter((o) => o.isCorrect)
                    .map((o) => o.text)
                    .join(', ')
                : '';
            const selectedOptions =
              q.format !== 'OA'
                ? ans.selectedIndices
                    .map(
                      (i) =>
                        (q as Extract<typeof q, { format: 'CS' | 'CM' | 'CI' }>).options[i]
                          ?.text ?? '',
                    )
                    .join(', ')
                : '';

            return (
              <Card key={qi} style={styles.reviewCard}>
                <Text style={styles.reviewQuestion}>{q.question}</Text>
                <View style={styles.reviewAnswers}>
                  <Text style={styles.reviewWrong}>Your answer: {selectedOptions || '—'}</Text>
                  <Text style={styles.reviewCorrect}>Correct: {correctOptions || '—'}</Text>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, maxWidth: 820, width: '100%', alignSelf: 'center' },
  summaryCard: { alignItems: 'center', gap: 6 },
  icon: { fontSize: 40, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#f5ead6' },
  subtitle: { fontSize: 13, color: 'rgba(245,234,214,0.45)', marginBottom: 8 },
  score: { fontSize: 52, fontWeight: '700', color: '#c4622d' },
  detail: { fontSize: 13, color: 'rgba(245,234,214,0.45)', marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  reviewLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#c4622d',
    marginTop: 24,
    marginBottom: 12,
  },
  reviewCard: { marginBottom: 10 },
  reviewQuestion: { fontSize: 15, color: '#f5ead6', fontWeight: '600', marginBottom: 10, lineHeight: 22 },
  reviewAnswers: { gap: 4 },
  reviewWrong: { fontSize: 13, color: '#e0a8a8' },
  reviewCorrect: { fontSize: 13, color: '#a0dca0' },
});
