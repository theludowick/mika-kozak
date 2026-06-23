import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, RefreshControl, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMenuItems, bulkMoveCategory } from '../../services/menuService';
import { useCategories } from '../../services/categoryService';
import { moveItemsToTrash } from '../../services/trashService';
import { useMenuFilters } from './useMenuFilters';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../auth/AuthContext';
import { QUERY_KEYS } from '../../constants/queryKeys';
import type { MenuItem } from '../../types/menu';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BulkActionBar } from './components/BulkActionBar';
import { ItemFormModal } from './components/ItemFormModal';
import { C, FONT } from '../../constants/theme';

type ViewMode = 'grid' | 'list';

// ── Row-based flat list items ─────────────────────────────────────────────────

type FlatRow =
  | { _type: 'catHeader'; category: string }
  | { _type: 'gridRow';   items: MenuItem[]; cols: number }
  | { _type: 'listItem';  item: MenuItem };

function buildRows(items: MenuItem[], viewMode: ViewMode, cols: number, withHeaders: boolean): FlatRow[] {
  if (viewMode === 'list') {
    const rows: FlatRow[] = [];
    let lastCat = '\0';
    items.forEach((item) => {
      if (withHeaders && item.category !== lastCat) {
        rows.push({ _type: 'catHeader', category: item.category });
        lastCat = item.category;
      }
      rows.push({ _type: 'listItem', item });
    });
    return rows;
  }

  const rows: FlatRow[] = [];
  let lastCat = '\0';
  let bucket: MenuItem[] = [];

  const flushBucket = () => {
    if (bucket.length > 0) {
      rows.push({ _type: 'gridRow', items: [...bucket], cols });
      bucket = [];
    }
  };

  items.forEach((item) => {
    if (withHeaders && item.category !== lastCat) {
      flushBucket();
      rows.push({ _type: 'catHeader', category: item.category });
      lastCat = item.category;
    }
    bucket.push(item);
    if (bucket.length === cols) flushBucket();
  });
  flushBucket();
  return rows;
}

function getGridCols(w: number): number {
  if (Platform.OS !== 'web') return 2;
  if (w >= 1400) return 6;
  if (w >= 1100) return 5;
  if (w >= 800)  return 4;
  if (w >= 560)  return 3;
  return 2;
}

const GRID_PADDING = 12;
const GRID_GAP     = 8;

export function MenuListScreen() {
  const router        = useRouter();
  const queryClient   = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const { location }  = useLocation();
  const { isAdmin }   = useAuth();

  const { data: items,      isLoading,  isError,   error,  refetch, isFetching } = useMenuItems();
  const { data: categories, isLoading: catLoading, isError: catError } = useCategories();

  const [viewMode,    setViewMode]    = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  const categoryOrder = useMemo(
    () => (categories ?? []).map((c) => c.name),
    [categories],
  );

  const { filters, filtered, categories: filterCategories, subCategories, setSearch, setCategory, setSubCategory } =
    useMenuFilters(items, location, categoryOrder);

  const gridCols      = getGridCols(windowWidth);
  const gridItemWidth = (windowWidth - GRID_PADDING * 2 - GRID_GAP * (gridCols - 1)) / gridCols;
  const activeFilters = (filters.category ? 1 : 0) + (filters.subCategory ? 1 : 0);

  const rows = useMemo(
    () => buildRows(filtered, viewMode, gridCols, !showFilters),
    [filtered, viewMode, gridCols, showFilters],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkMove = async (category: string) => {
    await bulkMoveCategory([...selectedIds], category);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
  };

  const handleBulkDelete = async () => {
    const toDelete = (items ?? []).filter((i) => selectedIds.has(i.id));
    await moveItemsToTrash(toDelete);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
  };

  if (isLoading) return <LoadingState message="Loading menu…" />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  return (
    <View style={styles.container}>
      {/* Search + filter toggle */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items…"
          placeholderTextColor={C.textMuted}
          value={filters.search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={[styles.filterBtnText, showFilters && styles.filterBtnTextActive]}>FILTER</Text>
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category + sub-category filters */}
      {showFilters && (
        <View style={styles.expandedFilters}>
          {filterCategories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="All" active={!filters.category} onPress={() => setCategory('')} variant="accent" />
                {filterCategories.map((cat) => (
                  <Chip key={cat} label={cat} active={filters.category === cat}
                    onPress={() => setCategory(filters.category === cat ? '' : cat)} variant="accent" />
                ))}
              </ScrollView>
            </View>
          )}
          {subCategories.length > 1 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sub-category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="All" active={!filters.subCategory} onPress={() => setSubCategory('')} variant="accent" />
                {subCategories.map((sub) => (
                  <Chip key={sub} label={sub} active={filters.subCategory === sub}
                    onPress={() => setSubCategory(filters.subCategory === sub ? '' : sub)} variant="accent" />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Results bar + view toggle + admin Edit category button */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultCount}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.viewToggle}>
          {isAdmin && (
            <TouchableOpacity style={styles.editCatBtn} onPress={() => setShowAddItem(true)}>
              <Text style={styles.editCatBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.viewBtnIcon, viewMode === 'grid' && styles.viewBtnIconActive]}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewBtnIcon, viewMode === 'list' && styles.viewBtnIconActive]}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Item rows */}
      <FlatList
        key={`${viewMode}-${gridCols}-${showFilters}`}
        data={rows}
        keyExtractor={(row, i) => {
          if (row._type === 'catHeader') return `hdr-${row.category}`;
          if (row._type === 'gridRow')   return `grow-${i}`;
          return `li-${row.item.id}`;
        }}
        renderItem={({ item: row }) => {
          if (row._type === 'catHeader') return <CategoryHeader label={row.category} />;
          if (row._type === 'gridRow') {
            return (
              <GridRow
                items={row.items}
                cols={row.cols}
                itemWidth={gridItemWidth}
                isAdmin={isAdmin}
                selectedIds={selectedIds}
                onPress={(item) => {
                  if (isSelecting && isAdmin) { toggleSelect(item.id); return; }
                  router.push(`/menu/${item.id}`);
                }}
                onLongPress={(item) => { if (isAdmin) toggleSelect(item.id); }}
              />
            );
          }
          return (
            <ListCard
              item={row.item}
              isAdmin={isAdmin}
              selected={selectedIds.has(row.item.id)}
              onPress={() => {
                if (isSelecting && isAdmin) { toggleSelect(row.item.id); return; }
                router.push(`/menu/${row.item.id}`);
              }}
              onLongPress={() => { if (isAdmin) toggleSelect(row.item.id); }}
            />
          );
        }}
        contentContainerStyle={viewMode === 'grid' ? styles.gridList : styles.flatList}
        ListEmptyComponent={
          <EmptyState title="No items found" message="Try adjusting your filters or search term." />
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems })}
            tintColor={C.primary}
          />
        }
      />

      {/* Bulk action bar */}
      {isSelecting && isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          categories={categories ?? []}
          onMoveCategory={handleBulkMove}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <ItemFormModal
        visible={showAddItem}
        categories={categories ?? []}
        items={items ?? []}
        onClose={() => setShowAddItem(false)}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ label, active, onPress, variant }: { label: string; active: boolean; onPress: () => void; variant: 'primary' | 'accent' }) {
  const activeColor = variant === 'primary' ? C.primary : C.accent;
  const activeBg    = variant === 'primary' ? C.primaryMuted : C.accentMuted;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && { borderColor: activeColor, backgroundColor: activeBg }]}
    >
      <Text style={[styles.chipText, active && { color: activeColor, fontFamily: FONT.semiBold }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CategoryHeader({ label }: { label: string }) {
  return (
    <View style={styles.catHeader}>
      <Text style={styles.catHeaderText}>{label}</Text>
      <View style={styles.catHeaderLine} />
    </View>
  );
}

function GridRow({
  items, cols, itemWidth, isAdmin, selectedIds, onPress, onLongPress,
}: {
  items: MenuItem[];
  cols: number;
  itemWidth: number;
  isAdmin: boolean;
  selectedIds: Set<string>;
  onPress: (item: MenuItem) => void;
  onLongPress: (item: MenuItem) => void;
}) {
  return (
    <View style={[styles.gridRow, { gap: GRID_GAP }]}>
      {items.map((item) => {
        const selected = selectedIds.has(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.gridCard, { width: itemWidth }, selected && styles.cardSelected]}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}`}
          >
            {selected && (
              <View style={styles.checkOverlay}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.gridImage} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.gridImage, styles.imagePlaceholder]} />
            )}
            <View style={styles.gridBody}>
              <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
              {item.subCategory ? (
                <Text style={styles.gridSub} numberOfLines={1}>{item.subCategory}</Text>
              ) : item.category ? (
                <Text style={styles.gridSub} numberOfLines={1}>{item.category}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {Array.from({ length: cols - items.length }).map((_, i) => (
        <View key={`ph-${i}`} style={{ width: itemWidth }} />
      ))}
    </View>
  );
}

function ListCard({
  item, isAdmin, selected, onPress, onLongPress,
}: {
  item: MenuItem;
  isAdmin: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.listCard, selected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name}`}
    >
      <View style={styles.listImageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.listImage} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.listImage, styles.imagePlaceholder]} />
        )}
        {selected && (
          <View style={styles.listCheckOverlay}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.listBody}>
        <Text style={styles.listName}>{item.name}</Text>
        {(item.category || item.subCategory) ? (
          <View style={styles.listBreadcrumb}>
            {item.category    ? <Text style={styles.listBreadcrumbCat}>{item.category}</Text> : null}
            {item.category && item.subCategory ? <Text style={styles.listBreadcrumbSep}> › </Text> : null}
            {item.subCategory ? <Text style={styles.listBreadcrumbSub}>{item.subCategory}</Text> : null}
          </View>
        ) : null}
      </View>
      <Text style={styles.listArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  searchInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    color: C.text, fontSize: 15, fontFamily: FONT.regular, minHeight: 46,
  },
  filterBtn: {
    height: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive:     { borderColor: C.primary, backgroundColor: C.primaryMuted },
  filterBtnText:       { fontSize: 11, letterSpacing: 1.5, fontFamily: FONT.semiBold, color: C.textSub },
  filterBtnTextActive: { color: C.primary },
  filterBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#fff', fontFamily: FONT.bold },

  expandedFilters: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 10, paddingTop: 2 },
  filterSection:   { paddingTop: 10 },
  filterLabel: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, paddingHorizontal: 14, marginBottom: 7,
  },
  chipRow: { paddingHorizontal: 12, gap: 7, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  chipText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  resultsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
  },
  resultCount:      { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },
  viewToggle:       { flexDirection: 'row', gap: 6, alignItems: 'center' },

  editCatBtn: {
    height: 34, paddingHorizontal: 12, borderRadius: 9,
    borderWidth: 1, borderColor: C.borderBright, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  editCatBtnText: { fontSize: 12, color: C.textSub, fontFamily: FONT.semiBold },

  viewBtn: {
    width: 34, height: 34, borderRadius: 9, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  viewBtnActive:     { borderColor: C.primary, backgroundColor: C.primaryMuted },
  viewBtnIcon:       { fontSize: 16, color: C.textMuted },
  viewBtnIconActive: { color: C.primary },

  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: GRID_PADDING, paddingTop: 16, paddingBottom: 10,
  },
  catHeaderText: {
    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textSub, fontFamily: FONT.semiBold,
  },
  catHeaderLine: { flex: 1, height: 1, backgroundColor: C.border },

  gridList: { paddingBottom: 40 },
  gridRow:  { flexDirection: 'row', paddingHorizontal: GRID_PADDING, marginBottom: GRID_GAP },
  gridCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
  gridImage: { width: '100%', aspectRatio: 1 },
  gridBody:  { padding: 8, gap: 2 },
  gridName:  { fontSize: 12, color: C.text,    fontFamily: FONT.semiBold, lineHeight: 17 },
  gridSub:   { fontSize: 10, color: C.textSub, fontFamily: FONT.regular },

  flatList: { padding: 12, paddingTop: 6, paddingBottom: 40 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  listImageWrap: { position: 'relative' },
  listImage:     { width: 58, height: 58 },
  listBody:      { flex: 1, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  listName:          { fontSize: 15, color: C.text, fontFamily: FONT.semiBold },
  listBreadcrumb:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  listBreadcrumbCat: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontFamily: FONT.semiBold },
  listBreadcrumbSep: { fontSize: 9, color: C.textMuted, fontFamily: FONT.regular },
  listBreadcrumbSub: { fontSize: 9, color: C.textMuted, fontFamily: FONT.medium, textTransform: 'uppercase', letterSpacing: 1 },
  listArrow:         { fontSize: 20, color: C.textMuted, paddingRight: 14 },

  cardSelected:  { borderColor: C.primary, backgroundColor: C.primaryMuted },
  checkOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(123,120,255,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  listCheckOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(123,120,255,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 24, color: '#fff', fontFamily: FONT.bold },

  imagePlaceholder: { backgroundColor: C.surfaceHigh },
});
