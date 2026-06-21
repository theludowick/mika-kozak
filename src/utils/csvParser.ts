import Papa from 'papaparse';

/**
 * Parse CSV text into an array of objects keyed by header row values.
 * Uses PapaParse to correctly handle quoted commas, multiline cells, and
 * escaped quotes — never split raw lines by comma.
 *
 * Headers are lowercased and trimmed to normalise minor casing variations.
 */
export function parseCSVToObjects(csvText: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  if (result.errors.length > 0 && __DEV__) {
    console.warn('[csvParser] PapaParse warnings:', result.errors.slice(0, 5));
  }

  return result.data;
}

/**
 * Split a comma-or-semicolon-separated string into trimmed, non-empty tokens.
 * Used for Topics, Positions, and Location columns.
 */
export function splitDelimited(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
