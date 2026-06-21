import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { C, FONT } from '../../constants/theme';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="secondary" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
    backgroundColor: C.bg,
  },
  icon:    { fontSize: 32, color: C.gold },
  title:   { color: C.text, fontSize: 17, fontFamily: FONT.bold, textAlign: 'center' },
  message: { color: C.textSub, fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },
  button:  { marginTop: 8 },
});
