// src/components/ui/Button.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, loading, style, textStyle }: Props) {
  const bg = {
    primary: COLORS.primary,
    secondary: COLORS.accent,
    danger: COLORS.danger,
    outline: 'transparent',
    success: COLORS.success,
  }[variant];

  const textColor = variant === 'outline' ? COLORS.primary : '#fff';
  const border = variant === 'outline' ? { borderWidth: 2, borderColor: COLORS.primary } : {};

  const padding = { sm: 8, md: 14, lg: 18 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, paddingVertical: padding, ...border, opacity: disabled ? 0.5 : 1 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[s.label, { color: textColor, fontSize }, textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', letterSpacing: 0.3 },
});
