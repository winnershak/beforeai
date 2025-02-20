import { Stack } from 'expo-router';

export default function MissionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="math" />
      <Stack.Screen name="alarm-preview" />
      <Stack.Screen name="mathpreview" />
      <Stack.Screen name="mathmission" />
      <Stack.Screen name="alarm-trigger" />
    </Stack>
  );
} 