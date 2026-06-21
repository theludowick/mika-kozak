import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useQuizQuestions } from '../../services/quizService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { TOPIC_LIST } from '../../constants/topics';
import type { ParsedQuestion, QuizFilters } from '../../types/quiz';
import type { LocationCode } from '../../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import { POSITIONS } from '../../types/profile';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FilterChip } from '../../components/ui/FilterChip';
import { Button } from '../../components/ui/Button';
import { C, FONT } from '../../constants/theme';

interface QuizSetupScreenProps {
  onStart: (questions: ParsedQuestion[], filters: QuizFilters) => void;
}

export function QuizSetupScreen({ onStart }: QuizSetupScreenProps) {
  const queryClient = useQueryClient();
  const { data: questions, isLoading, isError, error, refetch, dataUpdatedAt } = useQuizQuestions();

  const [selectedLocation, setSelectedLocation] = useState<LocationCode | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([...TOPIC_LIST]);
  const [randomize, setRandomize] = useState(true);

  const locationQuestions = useMemo(() => {
    if (!questions) return [];
    if (!selectedLocation) return questions;
    return questions.filter(
      (q) => q.locations.length === 0 || q.locations.includes(selectedLocation),
    );
  }, [questions, selectedLocation]);

  const availablePositions = useMemo(() => {
    const codes = new Set<string>();
    locationQuestions.forEach((q) => q.positions.forEach((p) => codes.add(p)));
    return POSITIONS.filter((p) => codes.has(p.code));
  }, [locationQuestions]);

  const filteredCount = useMemo(() => {
    return locationQuestions.filter((q) => {
      if (selectedTopics.length > 0 && !q.topics.some((t) => selectedTopics.includes(t)))
        return false;
      if (
        selectedPositions.length > 0 &&
        q.positions.length > 0 &&
        !q.positions.some((p) => selectedPositions.includes(p))
      )
        return false;
      return true;
    }).length;
  }, [locationQuestions, selectedTopics, selectedPositions]);

  const handleSelectLocation = (loc: LocationCode) => {
    setSelectedLocation(loc);
    setSelectedPositions([]);
  };

  const handleStart = () => {
    if (!questions || selectedLocation === null) return;
    const filters: QuizFilters = {
      topics: selectedTopics,
      positions: selectedPositions,
      locations: [selectedLocation],
      item: '',
      randomizeOrder: randomize,
    };
    onStart(questions, filters);
  };

  const toggleAllTopics = () => {
    setSelectedTopics((prev) =>
      prev.length === TOPIC_LIST.length ? [] : [...TOPIC_LIST],
    );
  };

  if (isLoading) return <LoadingState message="Loading question bank…" />;
  if (isError)
    return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const allTopicsOn = selectedTopics.length === TOPIC_LIST.length;
  const locationSelected = selectedLocation !== null;
  const positionRequired = availablePositions.length > 0 && selectedPositions.length === 0;
  const canStart = filteredCount > 0 && !positionRequired;

  const lastRefreshed = dataUpdatedAt > 0
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quizQuestions })}
          tintColor={C.primary}
        />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ready to level up?</Text>
        <Text style={styles.heroSub}>
          <Text style={styles.heroBold}>{questions?.length ?? 0}</Text> questions available
        </Text>
        <View style={styles.heroBottom}>
          <TouchableOpacity onPress={() => void refetch()} style={styles.refreshPill}>
            <Text style={styles.refreshPillText}>↻  Refresh questions</Text>
          </TouchableOpacity>
          {lastRefreshed && (
            <Text style={styles.refreshedAt}>Updated {lastRefreshed}</Text>
          )}
        </View>
      </View>

      {/* Location */}
      <Text style={styles.sectionLabel}>Location</Text>
      <View style={styles.chips}>
        {ALL_LOCATIONS.map((loc) => (
          <FilterChip
            key={loc}
            label={LOCATION_NAMES[loc]}
            selected={selectedLocation === loc}
            onPress={() => handleSelectLocation(loc)}
          />
        ))}
      </View>

      {!locationSelected && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>↑  Choose a location to unlock your quiz</Text>
        </View>
      )}

      {locationSelected && (
        <>
          {/* Position — required */}
          <Text style={styles.sectionLabel}>Position</Text>
          {availablePositions.length > 0 ? (
            <>
              <View style={styles.chips}>
                {availablePositions.map((p) => (
                  <FilterChip
                    key={p.code}
                    label={p.name}
                    selected={selectedPositions.includes(p.code)}
                    onPress={() =>
                      setSelectedPositions((prev) =>
                        prev.includes(p.code)
                          ? prev.filter((x) => x !== p.code)
                          : [...prev, p.code],
                      )
                    }
                  />
                ))}
              </View>
              {positionRequired && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>↑  Select your position to continue</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noneNote}>No position-specific questions for this location.</Text>
          )}

          {selectedPositions.length > 0 && (
            <>
              {/* Topics */}
              <Text style={styles.sectionLabel}>
                Topics{'  '}
                <Text style={styles.optionalTag}>optional</Text>
              </Text>
              <View style={styles.chips}>
                <FilterChip label="All Topics" selected={allTopicsOn} onPress={toggleAllTopics} />
                {TOPIC_LIST.map((t) => (
                  <FilterChip
                    key={t}
                    label={t}
                    selected={selectedTopics.includes(t)}
                    onPress={() =>
                      setSelectedTopics((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                      )
                    }
                  />
                ))}
              </View>

              {/* Randomize */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Randomize order</Text>
                  <Text style={styles.toggleSub}>Shuffle questions every session</Text>
                </View>
                <Switch
                  value={randomize}
                  onValueChange={setRandomize}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Start */}
              <Button
                label={`Start  ·  ${filteredCount} questions`}
                onPress={handleStart}
                disabled={!canStart}
                style={styles.startBtn}
              />

              {filteredCount === 0 && (
                <Text style={styles.noMatch}>
                  No questions match your filters. Try selecting more topics.
                </Text>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  hero: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.borderBright,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  heroTitle:  { color: C.text,    fontSize: 22, fontFamily: FONT.extraBold, marginBottom: 4 },
  heroSub:    { color: C.textSub, fontSize: 14, fontFamily: FONT.regular,   marginBottom: 14 },
  heroBold:   { color: C.primary, fontFamily: FONT.bold },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  refreshPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.surface,
  },
  refreshPillText: { color: C.textSub, fontSize: 12, fontFamily: FONT.medium },
  refreshedAt:     { color: C.textMuted, fontSize: 11, fontFamily: FONT.regular },

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.textMuted,
    fontFamily: FONT.semiBold,
    marginBottom: 12,
    marginTop: 4,
  },
  optionalTag: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    color: C.textMuted,
    fontFamily: FONT.regular,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  hintBox: {
    backgroundColor: C.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  hintText: { color: C.primary, fontSize: 13, fontFamily: FONT.medium },
  noneNote: { color: C.textMuted, fontSize: 13, fontFamily: FONT.regular, marginBottom: 24 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  toggleLabel: { color: C.text,    fontSize: 15, fontFamily: FONT.semiBold },
  toggleSub:   { color: C.textSub, fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },

  startBtn: { marginBottom: 12 },
  noMatch: {
    color: C.textMuted,
    fontSize: 13,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
});
