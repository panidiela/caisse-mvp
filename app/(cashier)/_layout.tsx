import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useStore } from '../../src/store/useStore';

type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

function canAccessCashier(role?: AppRole | null): boolean {
  return role === 'cashier';
}

export default function CashierLayout() {
  const currentUser = useStore((s) => s.currentUser);

  if (!canAccessCashier(currentUser?.role as AppRole | null | undefined)) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="caisse" />
      <Stack.Screen name="shift" />
    </Stack>
  );
}