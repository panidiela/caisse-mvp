import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function EntryScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const isHydrating = useStore((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.title}>Yewo</Text>
        <Text style={styles.subtitle}>Chargement de l’application…</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
});