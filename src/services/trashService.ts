import { supabase } from '../lib/supabase';
import type { MenuItem } from '../types/menu';

export async function moveItemsToTrash(items: MenuItem[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const trashRows = items.map((item) => ({
    original_id: item.id,
    csv_id: item.csvId || null,
    name: item.name,
    category: item.category || null,
    sub_category: item.subCategory || null,
    locations: item.locations,
    image_url: item.imageUrl || null,
    related_csv_ids: item.relatedIds,
    ingredients: item.fields.ingredients,
    description: item.fields.description,
    presentation: item.fields.presentation,
    takeout: item.fields.takeout,
    facts: item.fields.facts,
    upsell: item.fields.upsell,
    overrides: item.overrides,
    deleted_by: user?.id ?? null,
  }));

  const { error: insErr } = await supabase.from('menu_items_trash').insert(trashRows);
  if (insErr) throw new Error(insErr.message);

  const ids = items.map((i) => i.id);
  const { error: delErr } = await supabase.from('menu_items').delete().in('id', ids);
  if (delErr) throw new Error(delErr.message);
}
