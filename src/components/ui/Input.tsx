import React from 'react';
import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native';
import { C, FONT } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={C.textMuted}
        selectionColor={C.primary}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    color: C.textSub,
    fontSize: 13,
    fontFamily: FONT.medium,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: C.text,
    fontSize: 15,
    fontFamily: FONT.regular,
    minHeight: 50,
  },
  inputError: {
    borderColor: C.error,
  },
  error: {
    color: C.error,
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 5,
  },
});
