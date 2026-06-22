import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { MenuItem, MenuItemPhoto, LocationCode } from '../types/menu';
import { ALL_LOCATIONS } from '../types/menu';

async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id, csv_id, name, category, sub_category, locations, image_url, related_csv_ids,
      e_ingredients, e_description, e_presentation, e_takeout, e_facts,
      r_ingredients, r_description, r_presentation, r_takeout, r_facts,
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
      eatery: {
        ingredients: (row.e_ingredients as string | null) ?? '',
        description: (row.e_description as string | null) ?? '',
        presentation: (row.e_presentation as string | null) ?? '',
        takeout: (row.e_takeout as string | null) ?? '',
        facts: (row.e_facts as string | null) ?? '',
      },
      restaurant: {
        ingredients: (row.r_ingredients as string | null) ?? '',
        description: (row.r_description as string | null) ?? '',
        presentation: (row.r_presentation as string | null) ?? '',
        takeout: (row.r_takeout as string | null) ?? '',
        facts: (row.r_facts as string | null) ?? '',
      },
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
