import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26,51,40,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(245,234,214,0.18)',
    borderRadius: 13,
    padding: 18,
  },
});
