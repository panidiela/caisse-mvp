import { useEffect, useState } from 'react';
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
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      {/* Zones */}
      <Stack.Screen name="(server)" />
      <Stack.Screen name="(cashier)" />
      <Stack.Screen name="(manager)" />

      {/* écran global */}
      <Stack.Screen name="login" />
    </Stack>
  );
}