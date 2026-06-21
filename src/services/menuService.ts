import { useQuery } from '@tanstack/react-query';
import { fetchCSV } from './csvService';
import { fetchMenuPhotos } from './photoService';
import { ENV } from '../lib/env';
import { QUERY_KEYS } from '../constants/queryKeys';
import { MenuRowSchema } from '../types/menu';
import type { MenuItem, LocationCode } from '../types/menu';
import { parseLocations } from '../utils/locationParser';
import { normaliseImageUrl } from '../utils/imageUtils';
import { generateRowId } from '../utils/idGenerator';

function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseMenuRow(raw: Record<string, string>, rowIndex: number): MenuItem | null {
  // Normalise headers (the CSV may have minor whitespace differences)
  const normalised: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalised[normaliseHeader(k)] = v.trim();
  }

  const parsed = MenuRowSchema.safeParse(normalised);
  if (!parsed.success) {
    if (__DEV__) {
      console.warn(`[menuService] Row ${rowIndex} failed:`, parsed.error.issues[0]);
    }
    return null;
  }

  const row = parsed.data;
  const name = row.name?.trim();
  if (!name) return null;

  const category = (row.category ?? '').trim();
  const subCategory = (row['sub-category'] ?? '').trim();

  const id = generateRowId([name, category, subCategory, String(rowIndex)]);
  const csvId = (row.id ?? '').trim();
  const relatedIds = (row.related ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id,
    csvId,
    relatedIds,
    name,
    category,
    subCategory,
    locations: parseLocations(row.location),
    imageUrl: normaliseImageUrl(row.image),
    eatery: {
      ingredients: row.e_ingredients ?? '',
      description: row.e_description ?? '',
      presentation: row.e_presentation ?? '',
      takeout: row.e_takeout ?? '',
      facts: row.e_facts ?? '',
    },
    restaurant: {
      ingredients: row.r_ingredients ?? '',
      description: row.r_description ?? '',
      presentation: row.r_presentation ?? '',
      takeout: row.r_takeout ?? '',
      facts: row.r_facts ?? '',
    },
  };
}

async function fetchMenuItems(): Promise<MenuItem[]> {
  const [{ data }, photos] = await Promise.all([
    fetchCSV(ENV.MENU_CSV_URL),
    fetchMenuPhotos(),
  ]);
  const items: MenuItem[] = [];

  data.forEach((row, i) => {
    const item = parseMenuRow(row, i + 1);
    if (!item) return;
    items.push(
      item.csvId && photos[item.csvId]
        ? { ...item, imageUrl: photos[item.csvId] ?? null }
        : item,
    );
  });

  return items;
}

export function useMenuItems() {
  return useQuery({
    queryKey: QUERY_KEYS.menuItems,
    queryFn: fetchMenuItems,
    staleTime: 1000 * 60 * 15,
  });
}
