import { renderHook, act } from '@testing-library/react-native';
import { useMenuFilters } from '../src/features/menu/useMenuFilters';
import type { MenuItem } from '../src/types/menu';

const ITEMS: MenuItem[] = [
  {
    id: '1', csvId: 'borscht', relatedIds: [],
    name: 'Borscht',
    category: 'Soup',
    subCategory: 'Hot',
    locations: ['GT', 'NW'],
    imageUrl: null,
    eatery: { ingredients: 'beets', description: 'red soup', presentation: '', takeout: '', facts: '' },
    restaurant: { ingredients: 'beets, cream', description: 'refined borscht', presentation: '', takeout: '', facts: '' },
  },
  {
    id: '2', csvId: 'caesar', relatedIds: [],
    name: 'Caesar Salad',
    category: 'Salad',
    subCategory: 'Cold',
    locations: ['LG', 'GT'],
    imageUrl: null,
    eatery: { ingredients: 'romaine', description: 'classic caesar', presentation: '', takeout: '', facts: '' },
    restaurant: { ingredients: 'romaine, anchovies', description: 'elevated caesar', presentation: '', takeout: '', facts: '' },
  },
  {
    id: '3', csvId: 'pelmeni', relatedIds: [],
    name: 'Pelmeni',
    category: 'Mains',
    subCategory: 'Hot',
    locations: [],
    imageUrl: null,
    eatery: { ingredients: 'pork, dough', description: 'dumplings', presentation: '', takeout: '', facts: '' },
    restaurant: { ingredients: 'pork, dough', description: 'dumplings', presentation: '', takeout: '', facts: '' },
  },
];

describe('useMenuFilters', () => {
  it('returns all items with no filters', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    // Default location is GT — items available at GT: 1, 2, 3 (3 has no restriction)
    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by location', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => result.current.setLocation('NW'));
    // NW has items: 1 (GT,NW) and 3 (no restriction)
    expect(result.current.filtered.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('filters by search', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => {
      result.current.setLocation('ALL');
      result.current.setSearch('bors');
    });
    expect(result.current.filtered.map((i) => i.id)).toEqual(['1']);
  });

  it('filters by category', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => {
      result.current.setLocation('ALL');
      result.current.setCategory('Soup');
    });
    expect(result.current.filtered.map((i) => i.id)).toEqual(['1']);
  });

  it('resets sub-category when category changes', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => result.current.setSubCategory('Hot'));
    act(() => result.current.setCategory('Salad'));
    expect(result.current.filters.subCategory).toBe('');
  });

  it('builds category list from items', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    expect(result.current.categories).toEqual(['Mains', 'Salad', 'Soup']);
  });

  it('marks GT as non-eatery', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    expect(result.current.isEatery).toBe(false);
  });

  it('marks NW as eatery', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'NW'));
    expect(result.current.isEatery).toBe(true);
  });
});
