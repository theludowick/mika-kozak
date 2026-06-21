import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { C, FONT } from '../../constants/theme';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={C.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: C.bg,
  },
  text: {
    color: C.textSub,
    fontSize: 14,
    fontFamily: FONT.regular,
    textAlign: 'center',
  },
});
