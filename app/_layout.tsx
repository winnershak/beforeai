import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';
import { requestNotificationPermissions } from './notifications';
import { registerBackgroundTask } from './background-task';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useAlarmManager(); // This will check for active alarms on app launch

  useEffect(() => {
    // Only handle permissions and background task registration
    requestNotificationPermissions();
    registerBackgroundTask();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1C1C1E',  // Dark background
            },
            headerTintColor: '#fff',       // White text and icons
            headerTitleStyle: {
              color: '#fff',               // White title text
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="new-alarm" 
            options={{
              title: 'New Alarm',
              headerLargeTitle: false,
              headerTitleStyle: {
                fontSize: 17,
                fontWeight: '600',
              },
            }}
          />
          <Stack.Screen 
            name="missionselector" 
            options={{
              title: 'Choose Mission',
              presentation: 'card',
              headerLargeTitle: false,
              headerTitleStyle: {
                fontSize: 17,
                fontWeight: '600',
              },
            }}
          />
          <Stack.Screen name="mission/photo" options={{ title: 'Photo' }} />
          <Stack.Screen name="mission/photo-scanner" options={{ headerShown: false }} />
          <Stack.Screen name="mission/photo-preview" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
