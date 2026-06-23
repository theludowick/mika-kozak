import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import type { ParsedQuestion, MultipleChoiceQuestion, OpenAnswerQuestion, AnswerState } from '../../types/quiz';
import { FORMAT_LABELS } from '../../types/quiz';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { C, FONT } from '../../constants/theme';

interface QuizQuestionScreenProps {
  question: ParsedQuestion;
  questionNumber: number;
  totalQuestions: number;
  correctCount: number;
  answeredCount: number;
  answerState: AnswerState;
  hasPrev: boolean;
  onAnswerMC: (indices: number[]) => void;
  onRevealOpen: (text: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

function MultipleChoiceView({
  question,
  answerState,
  onAnswer,
  onSkip,
  onNext,
}: {
  question: MultipleChoiceQuestion;
  answerState: AnswerState;
  onAnswer: (indices: number[]) => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const isMulti = question.format === 'CM';
  const [pendingMulti, setPendingMulti] = useState<Set<number>>(new Set());

  const isAnswered = answerState.status === 'answered_mc' || answerState.status === 'skipped';
  const answered = answerState.status === 'answered_mc' ? answerState : null;

  const toggleMulti = (i: number) => {
    if (isAnswered) return;
    setPendingMulti((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleSinglePress = (i: number) => {
    if (!isAnswered) onAnswer([i]);
  };

  const handleSubmitMulti = () => {
    if (pendingMulti.size > 0) onAnswer([...pendingMulti]);
  };

  const getOptionStyle = (i: number) => {
    if (!isAnswered) {
      if (isMulti && pendingMulti.has(i)) return [styles.option, styles.optionPending];
      return [styles.option];
    }
    const isCorrect = question.options[i]?.isCorrect ?? false;
    const wasSelected = answered?.selectedIndices.includes(i) ?? false;
    if (isCorrect) return [styles.option, styles.optionCorrect];
    if (wasSelected && !isCorrect) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDim];
  };

  return (
    <>
      {question.format === 'CM' && (
        <Text style={styles.hint}>Select ALL that apply, then Submit</Text>
      )}
      {question.format === 'CI' && (
        <Text style={styles.hint}>Pick the ONE statement that is incorrect</Text>
      )}

      <View style={styles.optionsContainer}>
        {question.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={getOptionStyle(i)}
            onPress={() => (isMulti ? toggleMulti(i) : handleSinglePress(i))}
            disabled={isAnswered}
            accessibilityRole="button"
            accessibilityLabel={`Option ${OPTION_LETTERS[i]}: ${opt.text}`}
          >
            <View style={[styles.optionBullet, isMulti && styles.optionBulletCheckbox]}>
              {isMulti && pendingMulti.has(i) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
              {!isMulti && <Text style={styles.optionLetter}>{OPTION_LETTERS[i]}</Text>}
            </View>
            <Text style={styles.optionText}>{opt.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isAnswered ? (
        <>
          {answered && (
            <View style={[styles.feedback, answered.isCorrect ? styles.feedbackOk : styles.feedbackNo]}>
              <Text style={styles.feedbackLabel}>
                {answered.isCorrect ? '✓  Correct' : '✗  Not quite'}
              </Text>
              {!answered.isCorrect && (
                <Text style={styles.feedbackText}>
                  Correct answer:{' '}
                  {question.options
                    .map((o, i) => (o.isCorrect ? `${OPTION_LETTERS[i]}. ${o.text}` : null))
                    .filter(Boolean)
                    .join(';  ')}
                </Text>
              )}
            </View>
          )}
          <Button label="Continue  →" onPress={onNext} style={styles.nextBtn} />
        </>
      ) : isMulti ? (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <Button
            label="Submit"
            onPress={handleSubmitMulti}
            disabled={pendingMulti.size === 0}
            style={styles.submitBtn}
          />
        </View>
      ) : (
        <View style={styles.actionRowSingle}>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtnSingle}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

function OpenAnswerView({
  question,
  answerState,
  onReveal,
  onSkip,
  onNext,
}: {
  question: OpenAnswerQuestion;
  answerState: AnswerState;
  onReveal: (text: string) => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const [text, setText] = useState('');
  const isSkipped = answerState.status === 'skipped';
  const isRevealed = answerState.status === 'answered_open' && answerState.revealed;
  const isDone = isSkipped || isRevealed;

  return (
    <>
      <TextInput
        style={[styles.textarea, isDone && styles.textareaDisabled]}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={5}
        placeholder="Write your answer here…"
        placeholderTextColor={C.textMuted}
        editable={!isDone}
        textAlignVertical="top"
        accessibilityLabel="Open answer text input"
      />

      {isDone ? (
        <>
          {isRevealed && (
            <View style={styles.modelAnswer}>
              <Text style={styles.modelAnswerLabel}>Model Answer</Text>
              <Text style={styles.modelAnswerText}>{question.modelAnswer || '—'}</Text>
            </View>
          )}
          <Button label="Continue  →" onPress={onNext} style={styles.nextBtn} />
        </>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <Button label="Show Model Answer" onPress={() => onReveal(text)} style={styles.submitBtn} />
        </View>
      )}
    </>
  );
}

export function QuizQuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  correctCount,
  answeredCount,
  answerState,
  hasPrev,
  onAnswerMC,
  onRevealOpen,
  onSkip,
  onNext,
  onPrev,
  onExit,
}: QuizQuestionScreenProps) {
  const [showExitModal, setShowExitModal] = useState(false);

  const pctCorrect = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.scoreRow}>
          <Text style={styles.scorePill}>
            {correctCount}/{answeredCount}
            {pctCorrect !== null ? <Text style={styles.scorePct}>  {pctCorrect}%</Text> : null}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.questionCounter}>{questionNumber} / {totalQuestions}</Text>
          <TouchableOpacity onPress={() => setShowExitModal(true)} style={styles.exitBtn}>
            <Text style={styles.exitBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ProgressBar current={questionNumber - 1} total={totalQuestions} />

      {/* Card */}
      <View style={styles.card}>
        {/* Meta row */}
        <View style={styles.meta}>
          {question.topics[0] ? (
            <Text style={styles.metaCategory}>{question.topics[0]}</Text>
          ) : null}
          <View style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>{FORMAT_LABELS[question.format]}</Text>
          </View>
          {question.item ? (
            <Text style={styles.metaItem}>{question.item}</Text>
          ) : null}
        </View>

        {/* Question text */}
        <Text style={styles.questionText}>{question.question}</Text>

        {/* Image */}
        {question.imageUrl ? (
          <View style={styles.imageWrap}>
            <ImageWithFallback uri={question.imageUrl} />
          </View>
        ) : null}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Answer area */}
        {question.format === 'OA' ? (
          <OpenAnswerView
            question={question as OpenAnswerQuestion}
            answerState={answerState}
            onReveal={onRevealOpen}
            onSkip={onSkip}
            onNext={onNext}
          />
        ) : (
          <MultipleChoiceView
            question={question as MultipleChoiceQuestion}
            answerState={answerState}
            onAnswer={onAnswerMC}
            onSkip={onSkip}
            onNext={onNext}
          />
        )}
      </View>

      {hasPrev && (
        <TouchableOpacity onPress={onPrev} style={styles.prevBtn}>
          <Text style={styles.prevBtnText}>← Previous</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Leave quiz?</Text>
            <Text style={styles.confirmBody}>Your progress will be saved.</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmBtnKeep} onPress={() => setShowExitModal(false)}>
                <Text style={styles.confirmBtnKeepText}>Keep going</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnLeave} onPress={() => { setShowExitModal(false); onExit(); }}>
                <Text style={styles.confirmBtnLeaveText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreRow:       { flexDirection: 'row', alignItems: 'center' },
  scorePill:      { fontSize: 15, color: C.text, fontFamily: FONT.bold },
  scorePct:       { color: C.primary, fontFamily: FONT.bold },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questionCounter:{ fontSize: 13, color: C.textSub, fontFamily: FONT.medium },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtnText: { fontSize: 13, color: C.textSub },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },

  meta:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' },
  metaCategory:{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontFamily: FONT.semiBold },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.borderBright,
  },
  formatBadgeText: { fontSize: 10, color: C.primary, fontFamily: FONT.semiBold, letterSpacing: 0.5 },
  metaItem: { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular },

  imageWrap: { marginBottom: 16, borderRadius: 10, overflow: 'hidden' },

  questionText: {
    fontSize: 18,
    lineHeight: 28,
    color: C.text,
    fontFamily: FONT.semiBold,
    marginBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 18,
  },

  hint: {
    fontSize: 12,
    color: C.gold,
    fontFamily: FONT.medium,
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  optionsContainer: { gap: 9 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceHigh,
  },
  optionPending: {
    borderColor: C.primary,
    backgroundColor: C.primaryMuted,
  },
  optionCorrect: {
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
  },
  optionWrong: {
    borderColor: C.error,
    backgroundColor: C.errorMuted,
  },
  optionDim: { opacity: 0.4 },

  optionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  optionBulletCheckbox: {
    borderRadius: 6,
  },
  optionLetter: {
    fontSize: 11,
    color: C.textSub,
    fontFamily: FONT.bold,
  },
  checkmark: { fontSize: 12, color: C.primary, fontFamily: FONT.bold },
  optionText: { flex: 1, color: C.text, fontSize: 15, fontFamily: FONT.regular, lineHeight: 22 },

  feedback: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  feedbackOk: {
    backgroundColor: C.accentMuted,
    borderLeftColor: C.accent,
  },
  feedbackNo: {
    backgroundColor: C.errorMuted,
    borderLeftColor: C.error,
  },
  feedbackLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.text,
    fontFamily: FONT.bold,
    marginBottom: 4,
  },
  feedbackText: { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, lineHeight: 22 },

  modelAnswer: {
    marginTop: 14,
    padding: 14,
    backgroundColor: C.goldMuted,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    borderRadius: 10,
  },
  modelAnswerLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.gold,
    fontFamily: FONT.semiBold,
    marginBottom: 6,
  },
  modelAnswerText: { fontSize: 14, color: C.text, fontFamily: FONT.regular, lineHeight: 22 },

  textarea: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
    fontFamily: FONT.regular,
    minHeight: 120,
    lineHeight: 23,
    marginBottom: 14,
  },
  textareaDisabled: { opacity: 0.55 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  actionRowSingle: {
    flexDirection: 'row',
    marginTop: 14,
  },
  submitBtn: { flex: 5 },
  skipBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    minHeight: 50,
  },
  skipBtnSingle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
  },
  skipText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.textMuted,
  },
  nextBtn: { marginTop: 14 },

  prevBtn:     { paddingVertical: 12, alignItems: 'center' },
  prevBtnText: { color: C.textMuted, fontSize: 13, fontFamily: FONT.medium },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  confirmCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.border,
  },
  confirmTitle:        { fontSize: 18, fontFamily: FONT.semiBold, color: C.text, marginBottom: 8 },
  confirmBody:         { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, marginBottom: 24, lineHeight: 20 },
  confirmBtns:         { flexDirection: 'row', gap: 10 },
  confirmBtnKeep:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  confirmBtnKeepText:  { color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
  confirmBtnLeave:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: C.error, alignItems: 'center' },
  confirmBtnLeaveText: { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
});
