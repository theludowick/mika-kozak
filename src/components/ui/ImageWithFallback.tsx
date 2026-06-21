import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ImageWithFallbackProps {
  uri: string | null;
  style?: object;
  aspectRatio?: number;
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function ImageWithFallback({ uri, style, aspectRatio = 16 / 9, contentFit = 'contain' }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return (
      <View style={[styles.placeholder, { aspectRatio }, style]}>
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { aspectRatio }, style]}
      contentFit={contentFit}
      transition={200}
      onError={() => setErrored(true)}
      accessibilityLabel="Question image"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  placeholder: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(245,234,214,0.3)',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
