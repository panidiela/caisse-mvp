// src/components/ui/Badge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface Props {
  label: string;
  color?: string;
  textColor?: string;
}

export function Badge({ label, color = COLORS.primary, textColor = '#fff' }: Props) {
  return (
    <View style={[s.badge, { backgroundColor: color }]}>
      <Text style={[s.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.xl },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
