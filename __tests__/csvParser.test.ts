import { parseCSVToObjects, splitDelimited } from '../src/utils/csvParser';

describe('splitDelimited', () => {
  it('splits comma-separated values', () => {
    expect(splitDelimited('A, B, C')).toEqual(['A', 'B', 'C']);
  });

  it('splits semicolon-separated values', () => {
    expect(splitDelimited('A; B;C')).toEqual(['A', 'B', 'C']);
  });

  it('returns empty array for empty string', () => {
    expect(splitDelimited('')).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(splitDelimited(undefined)).toEqual([]);
  });

  it('trims whitespace', () => {
    expect(splitDelimited('  hello , world  ')).toEqual(['hello', 'world']);
  });

  it('filters empty tokens', () => {
    expect(splitDelimited('A,,B')).toEqual(['A', 'B']);
  });
});

describe('parseCSVToObjects', () => {
  it('parses basic CSV with headers', () => {
    const csv = `name,age\nAlice,30\nBob,25`;
    const result = parseCSVToObjects(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('handles quoted commas inside fields', () => {
    const csv = `name,description\nItem,"Has a comma, inside"`;
    const result = parseCSVToObjects(csv);
    expect(result[0]?.description).toBe('Has a comma, inside');
  });

  it('trims header whitespace', () => {
    const csv = ` name , age \nAlice,30`;
    const result = parseCSVToObjects(csv);
    expect(result[0]).toHaveProperty('name', 'Alice');
  });

  it('skips empty lines', () => {
    const csv = `name,age\nAlice,30\n\nBob,25`;
    const result = parseCSVToObjects(csv);
    expect(result).toHaveLength(2);
  });
});
