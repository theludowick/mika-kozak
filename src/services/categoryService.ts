import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { Category } from '../types/menu';

// ── Categories ────────────────────────────────────────────────────────────────

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    sortOrder: r.sort_order as number,
  }));
}

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 15,
  });
}

export async function renameCategory(id: string, oldName: string, newName: string): Promise<void> {
  const { error: itemsErr } = await supabase
    .from('menu_items')
    .update({ category: newName })
    .eq('category', oldName);
  if (itemsErr) throw new Error(itemsErr.message);

  const { error: subErr } = await supabase
    .from('sub_categories')
    .update({ category: newName })
    .eq('category', oldName);
  if (subErr) throw new Error(subErr.message);

  const { error: catErr } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('id', id);
  if (catErr) throw new Error(catErr.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('categories').update({ sort_order: i }).eq('id', id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// ── Sub-categories ────────────────────────────────────────────────────────────

export interface SubCategory {
  id: string;
  name: string;
  category: string;
  sortOrder: number;
}

async function fetchSubCategories(): Promise<SubCategory[]> {
  const { data, error } = await supabase
    .from('sub_categories')
    .select('id, name, category, sort_order')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    sortOrder: r.sort_order as number,
  }));
}

export function useSubCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.subCategories,
    queryFn: fetchSubCategories,
    staleTime: 1000 * 60 * 15,
  });
}

export async function addSubCategory(name: string, category: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('sub_categories')
    .insert({ name, category, sort_order: sortOrder });
  if (error) throw new Error(error.message);
}

export async function renameSubCategoryFull(
  id: string,
  category: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const { error: subErr } = await supabase
    .from('sub_categories')
    .update({ name: newName })
    .eq('id', id);
  if (subErr) throw new Error(subErr.message);

  const { error: itemsErr } = await supabase
    .from('menu_items')
    .update({ sub_category: newName })
    .eq('category', category)
    .eq('sub_category', oldName);
  if (itemsErr) throw new Error(itemsErr.message);
}

export async function moveSubCategoryToCategory(
  id: string,
  name: string,
  fromCategory: string,
  toCategory: string,
): Promise<void> {
  const { error: subErr } = await supabase
    .from('sub_categories')
    .update({ category: toCategory })
    .eq('id', id);
  if (subErr) throw new Error(subErr.message);

  const { error: itemsErr } = await supabase
    .from('menu_items')
    .update({ category: toCategory })
    .eq('category', fromCategory)
    .eq('sub_category', name);
  if (itemsErr) throw new Error(itemsErr.message);
}

export async function deleteSubCategoryFull(id: string, category: string, name: string): Promise<void> {
  const { error: delErr } = await supabase
    .from('sub_categories')
    .delete()
    .eq('id', id);
  if (delErr) throw new Error(delErr.message);

  const { error: itemsErr } = await supabase
    .from('menu_items')
    .update({ sub_category: '' })
    .eq('category', category)
    .eq('sub_category', name);
  if (itemsErr) throw new Error(itemsErr.message);
}

export async function reorderSubCategories(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('sub_categories').update({ sort_order: i }).eq('id', id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// Legacy — kept for backward compat (sub_categories table not involved)
export async function renameSubCategory(category: string, oldName: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ sub_category: newName })
    .eq('category', category)
    .eq('sub_category', oldName);
  if (error) throw new Error(error.message);
}

export async function deleteSubCategory(category: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ sub_category: '' })
    .eq('category', category)
    .eq('sub_category', name);
  if (error) throw new Error(error.message);
}
