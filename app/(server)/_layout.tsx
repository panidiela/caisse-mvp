// app/(server)/_layout.tsx
import { Stack } from 'expo-router';
export default function ServerLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
