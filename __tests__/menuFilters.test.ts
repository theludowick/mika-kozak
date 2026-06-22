import { renderHook, act } from '@testing-library/react-native';
import { useMenuFilters } from '../src/features/menu/useMenuFilters';
import type { MenuItem } from '../src/types/menu';

const makeItem = (partial: Omit<MenuItem, 'photos' | 'fields' | 'overrides'> & Partial<Pick<MenuItem, 'fields' | 'overrides'>>): MenuItem => ({
  photos: [],
  fields: { ingredients: '', description: '', presentation: '', takeout: '', facts: '', upsell: '' },
  overrides: {},
  ...partial,
});

const ITEMS: MenuItem[] = [
  makeItem({
    id: '1', csvId: 'borscht', relatedIds: [],
    name: 'Borscht', category: 'Soup', subCategory: 'Hot',
    locations: ['GT', 'NW'], imageUrl: null,
    fields: { ingredients: 'beets', description: 'red soup', presentation: '', takeout: '', facts: '', upsell: '' },
    overrides: { LG: { ingredients: 'beets, cream', description: 'refined borscht' }, GT: { ingredients: 'beets, cream', description: 'refined borscht' }, NT: { ingredients: 'beets, cream', description: 'refined borscht' } },
  }),
  makeItem({
    id: '2', csvId: 'caesar', relatedIds: [],
    name: 'Caesar Salad', category: 'Salad', subCategory: 'Cold',
    locations: ['LG', 'GT'], imageUrl: null,
    fields: { ingredients: 'romaine', description: 'classic caesar', presentation: '', takeout: '', facts: '', upsell: '' },
    overrides: { LG: { ingredients: 'romaine, anchovies', description: 'elevated caesar' }, GT: { ingredients: 'romaine, anchovies', description: 'elevated caesar' }, NT: { ingredients: 'romaine, anchovies', description: 'elevated caesar' } },
  }),
  makeItem({
    id: '3', csvId: 'pelmeni', relatedIds: [],
    name: 'Pelmeni', category: 'Mains', subCategory: 'Hot',
    locations: [], imageUrl: null,
  }),
];

describe('useMenuFilters', () => {
  it('returns items available at the given location (GT: all 3)', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    // GT: Borscht (GT,NW ✓), Caesar (LG,GT ✓), Pelmeni (no restriction ✓)
    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by location when rerendered with a new location (NW)', () => {
    const { result, rerender } = renderHook(
      ({ loc }: { loc: (typeof ITEMS)[0]['locations'][0] }) => useMenuFilters(ITEMS, loc),
      { initialProps: { loc: 'GT' as const } },
    );
    rerender({ loc: 'NW' });
    // NW: Borscht (GT,NW ✓), Pelmeni (no restriction ✓) — Caesar (LG,GT) excluded
    expect(result.current.filtered.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('filters by search', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => result.current.setSearch('bors'));
    expect(result.current.filtered.map((i) => i.id)).toEqual(['1']);
  });

  it('filters by category', () => {
    const { result } = renderHook(() => useMenuFilters(ITEMS, 'GT'));
    act(() => result.current.setCategory('Soup'));
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
});
