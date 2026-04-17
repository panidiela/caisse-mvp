import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useStore } from '../../src/store/useStore';

type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

function canAccessManager(role?: AppRole | null): boolean {
  return role === 'manager' || role === 'admin';
}

function canAccessStock(role?: AppRole | null): boolean {
  return role === 'stockist' || role === 'manager' || role === 'admin';
}

export default function ManagerLayout() {
  const currentUser = useStore((s) => s.currentUser);
  const pathname = usePathname();

  const isStockRoute = pathname?.includes('/stock');

  if (isStockRoute) {
    if (!canAccessStock(currentUser?.role as AppRole | null | undefined)) {
      return <Redirect href="/login" />;
    }
  } else {
    if (!canAccessManager(currentUser?.role as AppRole | null | undefined)) {
      return <Redirect href="/login" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="stock" />
    </Stack>
  );
}