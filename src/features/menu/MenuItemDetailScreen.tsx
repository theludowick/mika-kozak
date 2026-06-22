import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import type { MenuItem, LocationCode } from '../../types/menu';
import { resolveField, resolveRelatedIds, LOCATION_NAMES } from '../../types/menu';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { PhotoCarousel } from './components/PhotoCarousel';
import { AdminEditPanel } from './AdminEditPanel';
import { useAuth } from '../auth/AuthContext';
import { C, FONT } from '../../constants/theme';

interface MenuItemDetailScreenProps {
  item: MenuItem;
  selectedLocation: LocationCode;
  allItems: MenuItem[];
}

interface Section {
  label: string;
  value: string;
}

function getSections(item: MenuItem, location: LocationCode): Section[] {
  return [
    { label: 'Ingredients',  value: resolveField(item, location, 'ingredients') },
    { label: 'Description',  value: resolveField(item, location, 'description') },
    { label: 'Presentation', value: resolveField(item, location, 'presentation') },
    { label: 'Takeout',      value: resolveField(item, location, 'takeout') },
    { label: 'Facts',        value: resolveField(item, location, 'facts') },
    { label: 'Upsell',       value: resolveField(item, location, 'upsell') },
  ].filter((s) => s.value.trim() !== '');
}

export function MenuItemDetailScreen({ item, selectedLocation, allItems }: MenuItemDetailScreenProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Admin edit mode — full-screen panel
  if (isEditing && isAdmin) {
    return (
      <AdminEditPanel
        item={item}
        selectedLocation={selectedLocation}
        allItems={allItems}
        onSave={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  // ── View mode (same for admin and staff) ──────────────────────────────────

  const sections = getSections(item, selectedLocation);
  const relatedItems = resolveRelatedIds(item, selectedLocation)
    .map((csvId) => allItems.find((i) => i.csvId === csvId))
    .filter((i): i is MenuItem => i !== undefined);

  return (
    <View style={styles.root}>
      {/* Restore default header when not in edit mode */}
      <Stack.Screen options={{ headerLeft: undefined, gestureEnabled: true }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.carouselWrap}>
          <PhotoCarousel
            photos={item.photos}
            fallbackUrl={item.imageUrl}
            location={selectedLocation}
          />
        </View>

        <View style={styles.header}>
          <View style={styles.breadcrumb}>
            {item.category ? <Text style={styles.breadcrumbCategory}>{item.category}</Text> : null}
            {item.category && item.subCategory ? (
              <Text style={styles.breadcrumbSep}> › </Text>
            ) : null}
            {item.subCategory ? <Text style={styles.breadcrumbSub}>{item.subCategory}</Text> : null}
          </View>
          <Text style={styles.name}>{item.name}</Text>
        </View>

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

      {/* Floating edit button — admin only, top-right below header */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.floatingEditBtn}
          onPress={() => setIsEditing(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit item"
        >
          <Text style={styles.floatingEditIcon}>✎</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },

  carouselWrap: {
    width: '65%',
    alignSelf: 'center',
  },

  floatingEditBtn: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  floatingEditIcon: { fontSize: 17, color: C.textSub },

  header:        { marginBottom: 24 },
  breadcrumb:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  breadcrumbCategory: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
    color: C.primary, fontFamily: FONT.semiBold,
  },
  breadcrumbSep: { fontSize: 11, color: C.textMuted, fontFamily: FONT.regular },
  breadcrumbSub: { fontSize: 11, color: C.textMuted, fontFamily: FONT.medium, textTransform: 'uppercase', letterSpacing: 1 },
  name:          { fontSize: 26, fontFamily: FONT.extraBold, color: C.text, marginBottom: 6, lineHeight: 33 },

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
