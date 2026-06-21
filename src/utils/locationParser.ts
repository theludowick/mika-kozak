import type { LocationCode } from '../types/menu';
import { ALL_LOCATIONS } from '../types/menu';
import { splitDelimited } from './csvParser';

/**
 * Parse a raw location string (possibly comma/semicolon-separated) into
 * an array of known LocationCode values.
 *
 * Uses exact, case-insensitive matching against the known code list to avoid
 * partial matches — e.g. "NW" must not match "NEW" or some substring.
 */
export function parseLocations(raw: string | undefined): LocationCode[] {
  if (!raw) return [];

  const tokens = splitDelimited(raw);

  const results: LocationCode[] = [];
  for (const token of tokens) {
    const upper = token.toUpperCase();
    const match = ALL_LOCATIONS.find((code) => code === upper);
    if (match) results.push(match);
  }
  return results;
}

/**
 * Returns true if the item is available at the given location.
 * An empty locations array means "available everywhere".
 */
export function isAvailableAt(itemLocations: LocationCode[], selected: LocationCode): boolean {
  if (itemLocations.length === 0) return true;
  return itemLocations.includes(selected);
}
