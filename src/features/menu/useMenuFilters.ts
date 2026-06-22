import { useState, useMemo } from 'react';
import type { MenuItem, MenuFilters, LocationCode } from '../../types/menu';
import { EATERY_LOCATIONS } from '../../types/menu';
import { isAvailableAt } from '../../utils/locationParser';

export function useMenuFilters(items: MenuItem[] | undefined, location: LocationCode) {
  const [filters, setFilters] = useState<MenuFilters>({
    search: '',
    category: '',
    subCategory: '',
  });

  const categories = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  }, [items]);

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

    return result;
  }, [items, location, filters]);

  const setSearch = (search: string) => setFilters((f) => ({ ...f, search }));
  const setCategory = (category: string) =>
    setFilters((f) => ({ ...f, category, subCategory: '' }));
  const setSubCategory = (subCategory: string) => setFilters((f) => ({ ...f, subCategory }));

  const isEatery = EATERY_LOCATIONS.includes(location as 'VD' | 'NW');

  return {
    filters,
    filtered,
    categories,
    subCategories,
    setSearch,
    setCategory,
    setSubCategory,
    isEatery,
  };
}
