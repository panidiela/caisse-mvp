import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';

export default function LoginScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const users = useStore((s) => s.users);
  const login = useStore((s) => s.login);

  useEffect(() => {
    if (!isSetupComplete) {
      router.replace('/setup');
      return;
    }

    if (currentUser) {
      return;
    }

    const manager =
      users.find((user) => user.role === 'manager' && user.isActive !== false) ||
      users.find((user) => user.role === 'admin' && user.isActive !== false);

    if (manager) {
      login(manager);
      router.replace('/(manager)/dashboard');
    }
  }, [isSetupComplete, currentUser, users, login]);

  if (!isSetupComplete) {
    return <Redirect href="/setup" />;
  }

  if (currentUser?.role === 'server') {
    return <Redirect href="/(server)/tables" />;
  }

  if (currentUser?.role === 'cashier') {
    return <Redirect href="/(cashier)/caisse" />;
  }

  if (
    currentUser?.role === 'manager' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'stockist'
  ) {
    return <Redirect href="/(manager)/dashboard" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.title}>Yewo</Text>
        <Text style={styles.text}>Préparation de votre espace…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});