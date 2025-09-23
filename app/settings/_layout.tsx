import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,  // ← This will remove the extra headers
        }}
      />
      <Stack.Screen
        name="group-plan"
        options={{
          headerShown: true,
          title: 'Group Plan',
          headerStyle: { backgroundColor: '#1C1C1E' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
} 