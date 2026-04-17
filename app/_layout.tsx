import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initAppRuntime } from '../src/core/bootstrap/initAppRuntime';

export default function RootLayout() {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initAppRuntime();
      } catch (error) {
        console.error('Root bootstrap failed', error);
      }
    };

    bootstrap();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}