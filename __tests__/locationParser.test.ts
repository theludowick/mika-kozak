import { parseLocations, isAvailableAt } from '../src/utils/locationParser';

describe('parseLocations', () => {
  it('parses single location', () => {
    expect(parseLocations('GT')).toEqual(['GT']);
  });

  it('parses multiple comma-separated locations', () => {
    expect(parseLocations('GT, NW, LG')).toEqual(['GT', 'NW', 'LG']);
  });

  it('is case-insensitive', () => {
    expect(parseLocations('gt')).toEqual(['GT']);
    expect(parseLocations('nw')).toEqual(['NW']);
  });

  it('ignores unknown location codes', () => {
    expect(parseLocations('GT, NOTACODE, NW')).toEqual(['GT', 'NW']);
  });

  it('returns empty array for empty string', () => {
    expect(parseLocations('')).toEqual([]);
    expect(parseLocations(undefined)).toEqual([]);
  });

  it('does not partial-match (NW must not match NEW)', () => {
    expect(parseLocations('NEW')).toEqual([]);
    expect(parseLocations('NW')).toEqual(['NW']);
  });

  it('trims whitespace', () => {
    expect(parseLocations('  GT  ,  LG  ')).toEqual(['GT', 'LG']);
  });
});

describe('isAvailableAt', () => {
  it('returns true when item has no location restriction', () => {
    expect(isAvailableAt([], 'GT')).toBe(true);
  });

  it('returns true when location matches', () => {
    expect(isAvailableAt(['GT', 'NW'], 'GT')).toBe(true);
  });

  it('returns false when location does not match', () => {
    expect(isAvailableAt(['GT', 'NW'], 'LG')).toBe(false);
  });
});
