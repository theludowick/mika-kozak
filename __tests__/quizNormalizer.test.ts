import {
  parseCorrectIndices,
  buildShuffledOptions,
  normaliseForCompare,
  isActiveQuestion,
  parseFormat,
} from '../src/utils/quizNormalizer';

describe('parseCorrectIndices', () => {
  it('parses single letter A-D', () => {
    expect(parseCorrectIndices('A')).toEqual([0]);
    expect(parseCorrectIndices('B')).toEqual([1]);
    expect(parseCorrectIndices('C')).toEqual([2]);
    expect(parseCorrectIndices('D')).toEqual([3]);
  });

  it('is case-insensitive', () => {
    expect(parseCorrectIndices('a')).toEqual([0]);
    expect(parseCorrectIndices('d')).toEqual([3]);
  });

  it('parses multiple letters for CM', () => {
    expect(parseCorrectIndices('A,C')).toEqual([0, 2]);
    expect(parseCorrectIndices('B;D')).toEqual([1, 3]);
  });

  it('handles TRUE/FALSE', () => {
    expect(parseCorrectIndices('True')).toEqual([0]);
    expect(parseCorrectIndices('False')).toEqual([1]);
  });

  it('returns empty array for blank', () => {
    expect(parseCorrectIndices('')).toEqual([]);
    expect(parseCorrectIndices(undefined)).toEqual([]);
  });

  it('returns empty array for full answer text', () => {
    expect(parseCorrectIndices('Pinot Noir')).toEqual([]);
  });

  it('deduplicates indices', () => {
    expect(parseCorrectIndices('A,A')).toEqual([0]);
  });
});

describe('buildShuffledOptions', () => {
  it('includes only non-empty options', () => {
    const opts = buildShuffledOptions(['Yes', 'No', '', ''], [0]);
    expect(opts).toHaveLength(2);
  });

  it('preserves isCorrect flag through shuffle', () => {
    const opts = buildShuffledOptions(['Alpha', 'Beta', 'Gamma', 'Delta'], [1]);
    expect(opts).not.toBeNull();
    const correctOpts = opts!.filter((o) => o.isCorrect);
    expect(correctOpts).toHaveLength(1);
    expect(correctOpts[0]!.text).toBe('Beta');
  });

  it('returns null for all-empty options', () => {
    expect(buildShuffledOptions(['', '', '', ''], [0])).toBeNull();
  });
});

describe('normaliseForCompare', () => {
  it('lowercases and trims', () => {
    expect(normaliseForCompare('  Hello World  ')).toBe('hello world');
  });

  it('collapses internal whitespace', () => {
    expect(normaliseForCompare('hello   world')).toBe('hello world');
  });
});

describe('isActiveQuestion', () => {
  it('returns true for "Published" (any case)', () => {
    expect(isActiveQuestion('Published')).toBe(true);
    expect(isActiveQuestion('PUBLISHED')).toBe(true);
    expect(isActiveQuestion('published')).toBe(true);
    expect(isActiveQuestion('  Published  ')).toBe(true);
  });

  it('returns false for Draft or empty', () => {
    expect(isActiveQuestion('Draft')).toBe(false);
    expect(isActiveQuestion('')).toBe(false);
    expect(isActiveQuestion(undefined)).toBe(false);
  });
});

describe('parseFormat', () => {
  it('returns known formats', () => {
    expect(parseFormat('CS')).toBe('CS');
    expect(parseFormat('CM')).toBe('CM');
    expect(parseFormat('CI')).toBe('CI');
    expect(parseFormat('OA')).toBe('OA');
  });

  it('falls back to OA for unknown', () => {
    expect(parseFormat('XX')).toBe('OA');
    expect(parseFormat('')).toBe('OA');
    expect(parseFormat(undefined)).toBe('OA');
  });

  it('is case-insensitive', () => {
    expect(parseFormat('cs')).toBe('CS');
  });
});
