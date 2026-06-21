import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { C, FONT } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? C.bg : C.text} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: {
    backgroundColor: C.primary,
  },
  secondary: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.borderBright,
  },
  danger: {
    backgroundColor: C.errorMuted,
    borderWidth: 1,
    borderColor: C.error,
  },
  disabled: { opacity: 0.35 },
  text: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    letterSpacing: 0.2,
  },
  primaryText:   { color: '#fff' },
  secondaryText: { color: C.primary },
  ghostText:     { color: C.textSub },
  dangerText:    { color: C.error },
});
