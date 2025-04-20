import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack>
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