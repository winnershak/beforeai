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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Check if user has premium access
    const checkPremiumAccess = async () => {
      try {
        setIsLoading(true);
        
        // Initialize RevenueCat
        await RevenueCatService.initialize();
        
        // Check if user has premium access
        const isPremium = await RevenueCatService.checkSubscriptionStatus();
        
        // Check if user completed quiz
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        
        if (quizCompleted !== 'true' && !isPremium) {
          // Redirect to quiz if not completed and not premium
          router.replace('/quiz');
          return;
        }
        
        setIsPremium(isPremium);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking premium access:', error);
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
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#38383A',
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#1C1C1E',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alarms',
          tabBarIcon: ({ color }) => <Ionicons name="alarm" size={28} color={color} />,
          headerTitle: 'Alarms',
        }}
      />
      <Tabs.Screen
        name="trophies"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Ionicons name="trophy" size={28} color={color} />,
          headerTitle: 'Stats',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />,
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
