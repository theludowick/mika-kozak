import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { MenuItem, MenuItemPhoto, MenuItemOverrides, LocationCode } from '../types/menu';
import { ALL_LOCATIONS } from '../types/menu';

async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id, csv_id, name, category, sub_category, locations, image_url, related_csv_ids,
      ingredients, description, presentation, takeout, facts, upsell, overrides,
      menu_item_photos (id, image_url, locations, note, sort_order)
    `)
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row): MenuItem => {
    const photos: MenuItemPhoto[] = ((row.menu_item_photos ?? []) as {
      id: string; image_url: string; locations: string[]; note: string | null; sort_order: number;
    }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(p => ({
        id: p.id,
        imageUrl: p.image_url,
        locations: (p.locations ?? []).filter((l): l is LocationCode => ALL_LOCATIONS.includes(l as LocationCode)),
        note: p.note,
        sortOrder: p.sort_order,
      }));

    return {
      id: row.id as string,
      csvId: (row.csv_id as string | null) ?? '',
      relatedIds: (row.related_csv_ids as string[] | null) ?? [],
      name: row.name as string,
      category: (row.category as string | null) ?? '',
      subCategory: (row.sub_category as string | null) ?? '',
      locations: ((row.locations as string[] | null) ?? []).filter(
        (l): l is LocationCode => ALL_LOCATIONS.includes(l as LocationCode),
      ),
      imageUrl: photos[0]?.imageUrl ?? (row.image_url as string | null) ?? null,
      photos,
      fields: {
        ingredients: (row.ingredients as string | null) ?? '',
        description: (row.description as string | null) ?? '',
        presentation: (row.presentation as string | null) ?? '',
        takeout: (row.takeout as string | null) ?? '',
        facts: (row.facts as string | null) ?? '',
        upsell: (row.upsell as string | null) ?? '',
      },
      overrides: (row.overrides as MenuItemOverrides | null) ?? {},
    };
  });
}

export function useMenuItems() {
  return useQuery({
    queryKey: QUERY_KEYS.menuItems,
    queryFn: fetchMenuItems,
    staleTime: 1000 * 60 * 15,
  });
}

export async function updateMenuItem(
  id: string,
  patch: {
    name: string;
    category: string;
    subCategory: string;
    ingredients: string;
    description: string;
    presentation: string;
    takeout: string;
    facts: string;
    upsell: string;
    locations: LocationCode[];
    overrides: import('../types/menu').MenuItemOverrides;
    relatedIds: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({
      name:             patch.name,
      category:         patch.category,
      sub_category:     patch.subCategory,
      ingredients:      patch.ingredients,
      description:      patch.description,
      presentation:     patch.presentation,
      takeout:          patch.takeout,
      facts:            patch.facts,
      upsell:           patch.upsell,
      locations:        patch.locations,
      overrides:        patch.overrides,
      related_csv_ids:  patch.relatedIds,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkMoveCategory(ids: string[], category: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ category })
    .in('id', ids);
  if (error) throw new Error(error.message);
}
