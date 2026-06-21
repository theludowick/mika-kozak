/**
 * Generate a deterministic fallback ID from row data when the ID column is blank.
 * Uses a simple djb2 hash so the same row always produces the same ID.
 */
export function generateRowId(data: string[]): string {
  const str = data.join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return `row_${(hash >>> 0).toString(36)}`;
}
