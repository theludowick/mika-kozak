import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator,
} from 'react-native';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import { resizeImageUrl } from '../../../utils/imageUtils';
import type { MenuItemPhoto, LocationCode } from '../../../types/menu';
import { C, FONT } from '../../../constants/theme';

interface Slide {
  id: string;
  imageUrl: string | null;
  note?: string | null;
  isFallback?: boolean;
  photo?: MenuItemPhoto;
}

interface PhotoCarouselProps {
  photos: MenuItemPhoto[];
  fallbackUrl: string | null;
  location: LocationCode;
  isEditMode?: boolean;
  forceShowAll?: boolean;
  deletingPhotoId?: string | null;
  onDeletePhoto?: (photo: MenuItemPhoto) => void;
  onEditPhoto?: (photo: MenuItemPhoto) => void;
}

export function PhotoCarousel({
  photos,
  fallbackUrl,
  location,
  isEditMode = false,
  forceShowAll = false,
  deletingPhotoId,
  onDeletePhoto,
  onEditPhoto,
}: PhotoCarouselProps) {
  const [page, setPage] = useState(0);
  // Initialize with a real width so images render before onLayout fires
  const [slideW, setSlideW] = useState(() => Math.min(Dimensions.get('window').width - 32, 600));
  const slideWRef = useRef(slideW);
  const pageRef = useRef(0);

  // Edit mode shows all photos; view mode filters to the active location
  const visiblePhotos = (isEditMode || forceShowAll)
    ? photos
    : photos.filter((p) => p.locations.includes(location));

  const isFallback = visiblePhotos.length === 0;

  const slides: Slide[] = isFallback
    ? [{ id: '_fallback', imageUrl: isEditMode ? fallbackUrl : null, isFallback: true }]
    : visiblePhotos.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        note: p.note,
        photo: p,
      }));

  const currentSlide = slides[page] ?? slides[0];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = slideWRef.current;
    if (w <= 0) return;
    const newPage = Math.max(0, Math.min(Math.round(x / w), slides.length - 1));
    if (newPage !== pageRef.current) {
      pageRef.current = newPage;
      setPage(newPage);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={50}
        onMomentumScrollEnd={handleScroll}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          slideWRef.current = w;
          setSlideW(w);
        }}
        style={styles.scrollView}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: slideW }]}>
            {slide.imageUrl ? (
              <ImageWithFallback
                uri={resizeImageUrl(slide.imageUrl, 'w800') ?? slide.imageUrl}
                aspectRatio={4 / 3}
                contentFit="cover"
              />
            ) : (
              <View style={styles.placeholder} />
            )}

            {isEditMode && !slide.isFallback && slide.photo && (
              <View style={styles.editOverlay}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onEditPhoto?.(slide.photo!)}
                  disabled={deletingPhotoId === slide.photo.id}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.editBtnDanger]}
                  onPress={() => onDeletePhoto?.(slide.photo!)}
                  disabled={deletingPhotoId === slide.photo.id}
                >
                  {deletingPhotoId === slide.photo.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.editBtnText}>Delete</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {isEditMode && isFallback && (
        <View style={styles.fallbackWarning}>
          <Text style={styles.fallbackWarningText}>
            ⚠ No photos for this location — showing legacy image
          </Text>
        </View>
      )}

      {!isEditMode && currentSlide && !currentSlide.isFallback && currentSlide.note ? (
        <Text style={styles.note}>{currentSlide.note}</Text>
      ) : null}

      {slides.length > 1 && (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 12, width: '100%' },
  scrollView: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  slide: { aspectRatio: 4 / 3, overflow: 'hidden' },
  placeholder: { flex: 1, backgroundColor: C.surfaceHigh, aspectRatio: 4 / 3 },

  editOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  editBtnDanger: { backgroundColor: 'rgba(255,92,92,0.8)' },
  editBtnText: { color: '#fff', fontSize: 12, fontFamily: FONT.semiBold },

  fallbackWarning: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.gold,
  },
  fallbackWarningText: {
    fontSize: 12, color: C.gold, fontFamily: FONT.medium, textAlign: 'center',
  },

  note: {
    fontSize: 12, color: C.textSub, fontFamily: FONT.regular,
    fontStyle: 'italic', marginTop: 8, textAlign: 'center', paddingHorizontal: 16,
  },

  dots: { flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.primary, width: 18 },
});
