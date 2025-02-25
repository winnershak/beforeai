import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function setupNotifications() {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: "d43d4d10-e1e4-4b3e-8fbf-eb5981d8c9d5" // Replace with your project ID
        });
        console.log('Expo push token:', token.data);
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }

    setupNotifications();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#38383A',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alarms',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
