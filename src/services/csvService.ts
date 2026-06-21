import { parseCSVToObjects } from '../utils/csvParser';

export interface FetchCSVResult {
  data: Record<string, string>[];
  fetchedAt: Date;
}

/**
 * Fetch a published Google Sheets CSV URL and parse it.
 * Adds a cache-bust query param to avoid stale CDN responses.
 *
 * Throws a descriptive Error on network or parse failure so
 * TanStack Query can handle retries correctly.
 */
export async function fetchCSV(url: string): Promise<FetchCSVResult> {
  if (!url) throw new Error('CSV URL is not configured. Set EXPO_PUBLIC_QUIZ_CSV_URL or EXPO_PUBLIC_MENU_CSV_URL in .env');

  const bustUrl = `${url}${url.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;

  let response: Response;
  try {
    response = await fetch(bustUrl);
  } catch (e) {
    throw new Error(`Network request failed: ${(e as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Sheet responded with HTTP ${response.status}. Ensure the sheet is published as "Anyone with the link".`,
    );
  }

  const text = await response.text();

  if (!text || !text.includes(',')) {
    throw new Error('Received an empty or invalid response from the sheet.');
  }

  const data = parseCSVToObjects(text);

  if (data.length === 0) {
    throw new Error('The sheet appears to have no data rows.');
  }

  return { data, fetchedAt: new Date() };
}
