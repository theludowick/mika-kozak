import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { MenuItem, LocationCode } from '../../types/menu';
import { EATERY_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { C, FONT } from '../../constants/theme';

interface MenuItemDetailScreenProps {
  item: MenuItem;
  selectedLocation: LocationCode | 'ALL';
  allItems: MenuItem[];
}

interface Section {
  label: string;
  value: string;
}

function getSections(item: MenuItem, location: LocationCode | 'ALL'): Section[] {
  const locCode = location === 'ALL' ? null : location;
  const useEatery = locCode === null || EATERY_LOCATIONS.includes(locCode as 'VD' | 'NW');
  const fields = useEatery ? item.eatery : item.restaurant;

  return [
    { label: 'Ingredients', value: fields.ingredients },
    { label: 'Description', value: fields.description },
    { label: 'Presentation', value: fields.presentation },
    { label: 'Takeout', value: fields.takeout },
    { label: 'Facts', value: fields.facts },
  ].filter((s) => s.value.trim() !== '');
}

export function MenuItemDetailScreen({ item, selectedLocation, allItems }: MenuItemDetailScreenProps) {
  const router = useRouter();
  const sections = getSections(item, selectedLocation);
  const locationLabel =
    selectedLocation !== 'ALL' ? LOCATION_NAMES[selectedLocation as LocationCode] : 'All locations';

  const relatedItems = item.relatedIds
    .map((csvId) => allItems.find((i) => i.csvId === csvId))
    .filter((i): i is MenuItem => i !== undefined);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Image */}
      {item.imageUrl && (
        <View style={styles.imageWrap}>
          <ImageWithFallback uri={item.imageUrl} aspectRatio={4 / 3} contentFit="cover" />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.tagRow}>
          {item.category ? <Text style={styles.tagCategory}>{item.category}</Text> : null}
          {item.subCategory ? <Text style={styles.tagSub}>{item.subCategory}</Text> : null}
        </View>
        <Text style={styles.locationLabel}>{locationLabel}</Text>
      </View>

      {/* Content sections */}
      {sections.length > 0 ? (
        sections.map((sec) => (
          <View key={sec.label} style={styles.section}>
            <Text style={styles.sectionLabel}>{sec.label}</Text>
            <Text style={styles.sectionText}>{sec.value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyNote}>
          No details available for this item at the selected location.
        </Text>
      )}

      {/* Related items */}
      {relatedItems.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeader}>Related Items</Text>
          {relatedItems.map((rel) => (
            <TouchableOpacity
              key={rel.id}
              style={styles.relatedCard}
              onPress={() => router.push(`/menu/${rel.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View ${rel.name}`}
            >
              {rel.imageUrl ? (
                <View style={styles.relatedThumb}>
                  <ImageWithFallback uri={rel.imageUrl} aspectRatio={1} contentFit="cover" />
                </View>
              ) : (
                <View style={[styles.relatedThumb, styles.relatedThumbPlaceholder]} />
              )}
              <View style={styles.relatedInfo}>
                <Text style={styles.relatedName}>{rel.name}</Text>
                {rel.subCategory ? (
                  <Text style={styles.relatedSub}>{rel.subCategory}</Text>
                ) : rel.category ? (
                  <Text style={styles.relatedSub}>{rel.category}</Text>
                ) : null}
              </View>
              <Text style={styles.relatedArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  imageWrap: { width: '70%', alignSelf: 'center', marginBottom: 24, borderRadius: 16, overflow: 'hidden' },

  header:      { marginBottom: 24 },
  name:        { fontSize: 26, fontFamily: FONT.extraBold, color: C.text, marginBottom: 10, lineHeight: 33 },
  tagRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' },
  tagCategory: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.primary,
    fontFamily: FONT.semiBold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.borderBright,
  },
  tagSub:      { fontSize: 12, color: C.textSub, fontFamily: FONT.regular },
  locationLabel:{ fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },

  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: C.textMuted,
    fontFamily: FONT.semiBold,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: C.text,
    fontFamily: FONT.regular,
    lineHeight: 25,
  },
  emptyNote: {
    color: C.textMuted,
    fontStyle: 'italic',
    fontSize: 14,
    fontFamily: FONT.regular,
    textAlign: 'center',
    marginTop: 40,
  },

  relatedSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 22,
  },
  relatedHeader: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: C.textMuted,
    fontFamily: FONT.semiBold,
    marginBottom: 14,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  relatedThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
  },
  relatedThumbPlaceholder: { backgroundColor: C.surfaceHigh },
  relatedInfo:  { flex: 1 },
  relatedName:  { fontSize: 15, color: C.text,    fontFamily: FONT.semiBold },
  relatedSub:   { fontSize: 12, color: C.textSub, fontFamily: FONT.regular, marginTop: 2 },
  relatedArrow: { fontSize: 20, color: C.textMuted },
});
