import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function EntryScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const isHydrating = useStore((s) => s.isHydrating);
  const hydrateFromDb = useStore((s) => s.hydrateFromDb);

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});