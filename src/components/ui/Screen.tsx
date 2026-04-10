// src/components/ui/Screen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';

interface Props {
  title?: string;
  children: React.ReactNode;
  back?: boolean;
  rightAction?: { label: string; onPress: () => void };
}

export function Screen({ title, children, back, rightAction }: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      {title && (
        <View style={s.header}>
          {back && (
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>{'←'}</Text>
            </TouchableOpacity>
          )}
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {rightAction && (
            <TouchableOpacity onPress={rightAction.onPress} style={s.rightBtn}>
              <Text style={s.rightText}>{rightAction.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={s.content}>{children}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  rightBtn: { padding: 4 },
  rightText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  content: { flex: 1 },
});
