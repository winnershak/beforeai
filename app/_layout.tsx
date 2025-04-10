import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerBackgroundTask } from './background-task';
import { 
  requestNotificationPermissions, 
  setupNotificationHandlers, 
  stopAlarmSound,
  scheduleAlarmNotification,
  cancelAllNotifications
} from './notifications';
import { AppState, AppStateStatus, Platform, Keyboard, View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './components/ErrorBoundary';
import * as Linking from 'expo-linking';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { NativeModules } from 'react-native';
import AlarmSoundModule from './native-modules/AlarmSoundModule';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';
import { setupAlarms, scheduleAlarmNotification as setupAlarmsScheduleAlarmNotification } from './notifications';
import './utils/expo-sensors-patch';
import RevenueCatService from './services/RevenueCatService';
import { handleNotification } from './notifications';
import DebugScreen from './debug';

const { ScreenTimeBridge } = NativeModules;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(err => {
  console.log("Error preventing splash screen hide:", err);
});

// Global flag to track if alarm is active
let isAlarmActive = false;

const handleError = (error: Error) => {
  console.log('Caught error:', error);
  // Log to analytics or handle gracefully
};

// Define the task handler
TaskManager.defineTask('ALARM_TASK', async ({ data, error }) => {
  if (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
  
  try {
    // Get the alarm data
    const { alarmId, sound, soundVolume, hasMission } = data as any;
    
    // Set active alarm data
    const activeAlarmData = {
      alarmId,
      timestamp: new Date().getTime(),
      sound: sound || 'Beacon',
      soundVolume: soundVolume || 1,
      hasMission: hasMission || false
    };
    
    // Save active alarm data
    await AsyncStorage.setItem('activeAlarm', JSON.stringify(activeAlarmData));
    
    // Launch the app and navigate to alarm-ring screen
    await Linking.openURL(`exp://alarm-ring?alarmId=${alarmId}&sound=${sound}&soundVolume=${soundVolume}&hasMission=${hasMission}`);
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function AppLayout() {
  useEffect(() => {
    // Force hide the splash screen after a delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(e => {
        console.log('Failed to hide splash screen:', e);
        // Try alternative method if the first fails
        if (Platform.OS === 'ios') {
          NativeModules.SplashScreen?.hide?.();
        }
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Return the debug screen
  return <DebugScreen />;
}

// Helper function to clear all timeouts
function clearAllTimeouts() {
  const highestTimeoutId = setTimeout(() => {}, 0) as unknown as number;
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
  }
}