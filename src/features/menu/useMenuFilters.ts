import { useState, useMemo } from 'react';
import type { MenuItem, MenuFilters, LocationCode } from '../../types/menu';
import { isAvailableAt } from '../../utils/locationParser';

export function useMenuFilters(
  items: MenuItem[] | undefined,
  location: LocationCode,
  categoryOrder?: string[],
) {
  const [filters, setFilters] = useState<MenuFilters>({
    search: '',
    category: '',
    subCategory: '',
  });

  const categories = useMemo(() => {
    if (!items) return [];
    const unique = [...new Set(items.map((i) => i.category).filter(Boolean))];
    if (categoryOrder && categoryOrder.length > 0) {
      return unique.sort((a, b) => {
        const ai = categoryOrder.indexOf(a);
        const bi = categoryOrder.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      });
    }
    return unique.sort();
  }, [items, categoryOrder]);

  const subCategories = useMemo(() => {
    if (!items) return [];
    const source = filters.category
      ? items.filter((i) => i.category === filters.category)
      : items;
    return [...new Set(source.map((i) => i.subCategory).filter(Boolean))].sort();
  }, [items, filters.category]);

  const filtered = useMemo(() => {
    if (!items) return [];
    let result = items.filter((item) => isAvailableAt(item.locations, location));

    if (filters.category) {
      result = result.filter((item) => item.category === filters.category);
    }
    if (filters.subCategory) {
      result = result.filter((item) => item.subCategory === filters.subCategory);
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.subCategory.toLowerCase().includes(q),
      );
    }

    if (categoryOrder && categoryOrder.length > 0) {
      result = [...result].sort((a, b) => {
        const ai = categoryOrder.indexOf(a.category);
        const bi = categoryOrder.indexOf(b.category);
        const ao = ai === -1 ? Infinity : ai;
        const bo = bi === -1 ? Infinity : bi;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [items, location, filters, categoryOrder]);

  const setSearch      = (search: string)      => setFilters((f) => ({ ...f, search }));
  const setCategory    = (category: string)    => setFilters((f) => ({ ...f, category, subCategory: '' }));
  const setSubCategory = (subCategory: string) => setFilters((f) => ({ ...f, subCategory }));

  return { filters, filtered, categories, subCategories, setSearch, setCategory, setSubCategory };
}
