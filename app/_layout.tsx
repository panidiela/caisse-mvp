
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const initApp = useStore((s) => s.initApp);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await Promise.resolve(initApp());
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
  }, [initApp]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
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
    backgroundColor: '#ffffff',
  },
});