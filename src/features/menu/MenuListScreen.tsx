import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMenuItems } from '../../services/menuService';
import { useMenuFilters } from './useMenuFilters';
import { useSelectedLocation } from '../../hooks/useSelectedLocation';
import { QUERY_KEYS } from '../../constants/queryKeys';
import type { MenuItem, LocationCode } from '../../types/menu';
import { ALL_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { C, FONT } from '../../constants/theme';

type ViewMode = 'grid' | 'list';

// ── Row-based flat list items ────────────────────────────────────────────────

type FlatRow =
  | { _type: 'catHeader'; category: string }
  | { _type: 'gridRow';   items: MenuItem[]; cols: number }
  | { _type: 'listItem';  item: MenuItem };

function buildRows(
  items: MenuItem[],
  viewMode: ViewMode,
  cols: number,
  withHeaders: boolean,
): FlatRow[] {
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

  // Grid mode
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

// ── Column count ─────────────────────────────────────────────────────────────

function getGridCols(w: number): number {
  if (Platform.OS !== 'web') return 2;
  if (w >= 1400) return 6;
  if (w >= 1100) return 5;
  if (w >= 800)  return 4;
  if (w >= 560)  return 3;
  return 2;
}

// ── Main component ────────────────────────────────────────────────────────────

const GRID_PADDING = 12;
const GRID_GAP     = 8;

export function MenuListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const { location: defaultLocation, setLocation: setSavedLocation } = useSelectedLocation();
  const { data: items, isLoading, isError, error, refetch, isFetching } = useMenuItems();

  const [viewMode,    setViewMode]    = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const {
    filters,
    filtered,
    categories,
    subCategories,
    setSearch,
    setCategory,
    setSubCategory,
    setLocation,
  } = useMenuFilters(items, defaultLocation);

  const handleLocationChange = (loc: LocationCode) => {
    setLocation(loc);
    setSavedLocation(loc);
  };

  const gridCols      = getGridCols(windowWidth);
  const gridItemWidth = (windowWidth - GRID_PADDING * 2 - GRID_GAP * (gridCols - 1)) / gridCols;
  const activeFilters = (filters.category ? 1 : 0) + (filters.subCategory ? 1 : 0);

  const rows = useMemo(
    () => buildRows(filtered, viewMode, gridCols, !showFilters),
    [filtered, viewMode, gridCols, showFilters],
  );

  if (isLoading) return <LoadingState message="Loading menu…" />;
  if (isError)
    return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

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
          accessibilityLabel="Search menu items"
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel="Toggle category filters"
        >
          <Text style={[styles.filterBtnText, showFilters && styles.filterBtnTextActive]}>
            FILTER
          </Text>
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Location — always visible, no "All" option */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Location</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {ALL_LOCATIONS.map((loc) => (
            <Chip
              key={loc}
              label={LOCATION_NAMES[loc]}
              active={filters.location === loc}
              onPress={() => handleLocationChange(loc)}
              variant="primary"
            />
          ))}
        </ScrollView>
      </View>

      {/* Category + sub-category — behind filter toggle */}
      {showFilters && (
        <View style={styles.expandedFilters}>
          {categories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="All" active={!filters.category} onPress={() => setCategory('')} variant="accent" />
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={filters.category === cat}
                    onPress={() => setCategory(filters.category === cat ? '' : cat)}
                    variant="accent"
                  />
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
                  <Chip
                    key={sub}
                    label={sub}
                    active={filters.subCategory === sub}
                    onPress={() => setSubCategory(filters.subCategory === sub ? '' : sub)}
                    variant="accent"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Results bar + view toggle */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultCount}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {filters.location !== 'ALL' ? ` · ${LOCATION_NAMES[filters.location as LocationCode]}` : ''}
        </Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
            accessibilityLabel="Grid view"
          >
            <Text style={[styles.viewBtnIcon, viewMode === 'grid' && styles.viewBtnIconActive]}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
            accessibilityLabel="List view"
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
          if (row._type === 'catHeader') {
            return <CategoryHeader label={row.category} />;
          }
          if (row._type === 'gridRow') {
            return (
              <GridRow
                items={row.items}
                cols={row.cols}
                itemWidth={gridItemWidth}
                onPress={(item) => router.push(`/menu/${item.id}`)}
              />
            );
          }
          return (
            <ListCard item={row.item} onPress={() => router.push(`/menu/${row.item.id}`)} />
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
  items,
  cols,
  itemWidth,
  onPress,
}: {
  items: MenuItem[];
  cols: number;
  itemWidth: number;
  onPress: (item: MenuItem) => void;
}) {
  return (
    <View style={[styles.gridRow, { gap: GRID_GAP }]}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.gridCard, { width: itemWidth }]}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.name}`}
        >
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
      ))}
      {/* Phantom cells to keep alignment in last row */}
      {Array.from({ length: cols - items.length }).map((_, i) => (
        <View key={`ph-${i}`} style={{ width: itemWidth }} />
      ))}
    </View>
  );
}

function ListCard({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name}`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.listImage} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.listImage, styles.imagePlaceholder]} />
      )}
      <View style={styles.listBody}>
        <Text style={styles.listName}>{item.name}</Text>
        {item.category    ? <Text style={styles.listMeta}>{item.category}</Text>    : null}
        {item.subCategory ? <Text style={styles.listSub}>{item.subCategory}</Text>  : null}
      </View>
      <Text style={styles.listArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: C.text,
    fontSize: 15,
    fontFamily: FONT.regular,
    minHeight: 46,
  },
  filterBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive:    { borderColor: C.primary, backgroundColor: C.primaryMuted },
  filterBtnText:      { fontSize: 11, letterSpacing: 1.5, fontFamily: FONT.semiBold, color: C.textSub },
  filterBtnTextActive:{ color: C.primary },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#fff', fontFamily: FONT.bold },

  filterSection: { paddingTop: 10 },
  filterLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.textMuted,
    fontFamily: FONT.semiBold,
    paddingHorizontal: 14,
    marginBottom: 7,
  },
  chipRow: { paddingHorizontal: 12, gap: 7, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },

  expandedFilters: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 10,
    paddingTop: 2,
  },

  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultCount:       { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },
  viewToggle:        { flexDirection: 'row', gap: 4 },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive:     { borderColor: C.primary, backgroundColor: C.primaryMuted },
  viewBtnIcon:       { fontSize: 16, color: C.textMuted },
  viewBtnIconActive: { color: C.primary },

  // Category header
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 10,
  },
  catHeaderText: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.textSub,
    fontFamily: FONT.semiBold,
  },
  catHeaderLine: { flex: 1, height: 1, backgroundColor: C.border },

  // Grid
  gridList: { paddingBottom: 40 },
  gridRow:  {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    marginBottom: GRID_GAP,
  },
  gridCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImage: { width: '100%', aspectRatio: 1 },
  gridBody:  { padding: 8, gap: 2 },
  gridName:  { fontSize: 12, color: C.text,     fontFamily: FONT.semiBold, lineHeight: 17 },
  gridSub:   { fontSize: 10, color: C.textSub,  fontFamily: FONT.regular },

  // List
  flatList: { padding: 12, paddingTop: 6, paddingBottom: 40 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  listImage: { width: 76, height: 76 },
  listBody:  { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  listName:  { fontSize: 15, color: C.text,      fontFamily: FONT.semiBold },
  listMeta:  { fontSize: 12, color: C.primary,   fontFamily: FONT.medium },
  listSub:   { fontSize: 11, color: C.textMuted,  fontFamily: FONT.regular },
  listArrow: { fontSize: 20, color: C.textMuted,  paddingRight: 14 },

  imagePlaceholder: { backgroundColor: C.surfaceHigh },
});
