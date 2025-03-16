import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import RevenueCatService from '../services/RevenueCatService';
import { registerBackgroundTask } from '../background-task';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkPremiumAccess = async () => {
      try {
        setIsLoading(true);
        
        const isPremium = await RevenueCatService.checkLocalSubscriptionStatus();
        
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        
        if (quizCompleted !== 'true' && !isPremium) {
          router.replace('/quiz');
          return;
        }
        
        setIsPremium(isPremium);
        setIsLoading(false);
      } catch (error) {
        console.error('Error in premium access check:', error);
        setIsLoading(false);
      }
    };

    checkPremiumAccess();
  }, []);

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

  useEffect(() => {
    registerBackgroundTask().catch(console.error);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#38383A',
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTitleStyle: {
          color: '#fff',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alarms',
          tabBarIcon: ({ color }) => <Ionicons name="alarm" size={28} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="sounds"
        options={{
          title: 'Sounds',
          tabBarIcon: ({ color }) => <Ionicons name="musical-notes" size={28} color={color} />,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
