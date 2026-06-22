import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import type { MenuItem, LocationCode } from '../../types/menu';
import { EATERY_LOCATIONS, ALL_LOCATIONS, LOCATION_NAMES } from '../../types/menu';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { resizeImageUrl } from '../../utils/imageUtils';
import { uploadMenuPhoto } from '../../services/photoService';
import { useAuth } from '../auth/AuthContext';
import { QUERY_KEYS } from '../../constants/queryKeys';
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
  const useEatery = EATERY_LOCATIONS.includes(location as 'VD' | 'NW');
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
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uploading) {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, { toValue: 0.85, duration: 10000, useNativeDriver: false }).start();
    } else {
      Animated.timing(progressAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => {
        setTimeout(() => progressAnim.setValue(0), 400);
      });
    }
  }, [uploading]);

  const sections = getSections(item, selectedLocation);

  const relatedItems = item.relatedIds
    .map((csvId) => allItems.find((i) => i.csvId === csvId))
    .filter((i): i is MenuItem => i !== undefined);

  const displayImageUrl = localImageUrl ?? resizeImageUrl(item.imageUrl, 'w600') ?? item.imageUrl;

  const promptLocationThenUpload = (imageUri: string) => {
    Alert.alert(
      'Assign Location',
      'Which location is this photo for?',
      [
        ...ALL_LOCATIONS.map((loc) => ({
          text: `${loc} — ${LOCATION_NAMES[loc]}`,
          onPress: () => void doUpload(imageUri, [loc]),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const doUpload = async (imageUri: string, locations: LocationCode[]) => {
    const previousUrl = localImageUrl;
    setLocalImageUrl(imageUri);
    setUploading(true);
    try {
      await uploadMenuPhoto(item.id, imageUri, locations);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems });
    } catch (e) {
      setLocalImageUrl(previousUrl);
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });

    if (result.canceled || !result.assets[0]) return;
    promptLocationThenUpload(result.assets[0].uri);
  };

  const promptImageSource = () => {
    if (Platform.OS === 'web') return;
    Alert.alert('Upload Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => void handlePickImage('camera') },
      { text: 'Choose from Library', onPress: () => void handlePickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Image */}
      <View style={styles.imageWrap}>
        {displayImageUrl ? (
          <ImageWithFallback uri={displayImageUrl} aspectRatio={4 / 3} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        {uploading && <View style={styles.uploadOverlay} />}
      </View>

      {/* Upload progress bar */}
      {uploading && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]}
          />
        </View>
      )}

      {/* Admin photo buttons */}
      {isAdmin && (
        <View style={styles.adminRow}>
          {Platform.OS === 'web' ? (
            <>
              <TouchableOpacity style={styles.adminBtn} onPress={() => void handlePickImage('camera')}>
                <Text style={styles.adminBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminBtn} onPress={() => void handlePickImage('library')}>
                <Text style={styles.adminBtnText}>Library</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.adminBtn} onPress={promptImageSource}>
              <Text style={styles.adminBtnText}>
                {item.photos.length > 0 ? 'Add Another Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.tagRow}>
          {item.category ? <Text style={styles.tagCategory}>{item.category}</Text> : null}
          {item.subCategory ? <Text style={styles.tagSub}>{item.subCategory}</Text> : null}
        </View>
        <Text style={styles.locationLabel}>{LOCATION_NAMES[selectedLocation]}</Text>
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

  imageWrap: { width: '70%', alignSelf: 'center', marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  imagePlaceholder: { width: '100%', aspectRatio: 4 / 3, backgroundColor: C.surfaceHigh },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  adminRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  adminBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.surface,
  },
  adminBtnText: { fontSize: 12, color: C.textSub, fontFamily: FONT.medium },

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
