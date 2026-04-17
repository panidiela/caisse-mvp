import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useStore } from '../../src/store/useStore';

type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

function canAccessServer(role?: AppRole | null): boolean {
  return role === 'server';
}

export default function ServerLayout() {
  const currentUser = useStore((s) => s.currentUser);

  if (!canAccessServer(currentUser?.role as AppRole | null | undefined)) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tables" />
      <Stack.Screen name="order" />
    </Stack>
  );
}