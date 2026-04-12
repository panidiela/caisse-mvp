import React from 'react';
import { Redirect } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function EntryScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);

  if (!isSetupComplete) {
    return <Redirect href="/setup" />;
  }

  if (!currentUser) {
    return <Redirect href="/login" />;
  }

  if (currentUser.role === 'server') {
    return <Redirect href="/(server)/tables" />;
  }

  if (currentUser.role === 'cashier') {
    return <Redirect href="/(cashier)/caisse" />;
  }

  if (
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'stockist'
  ) {
    return <Redirect href="/(manager)/dashboard" />;
  }

  return <Redirect href="/login" />;
}