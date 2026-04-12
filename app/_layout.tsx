import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const store = useStore.getState();

        if (typeof store.initApp === 'function') {
          await Promise.resolve(store.initApp());
        }

        if (typeof store.hydrateFromDb === 'function') {
          await Promise.resolve(store.hydrateFromDb());
        }
      } catch (error) {
        console.error('Root bootstrap failed', error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f5b3a" />
        <Text style={styles.title}>Yewo</Text>
        <Text style={styles.subtitle}>Préparation de votre espace...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(server)" />
      <Stack.Screen name="(cashier)" />
      <Stack.Screen name="(manager)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 24,
  },
  title: {
    marginTop: 20,
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});