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
import { requestNotificationPermissions } from './notifications';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';
import { setupNotifications, scheduleRepeatingAlarmNotifications } from './notifications';
import './utils/expo-sensors-patch';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global flag to track if alarm is active
let isAlarmActive = false;

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const timerRef = useRef<NodeJS.Timeout>();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useAlarmManager(); // This will check for active alarms on app launch

  useEffect(() => {
    // Set a small delay to ensure the app is fully mounted
    const timer = setTimeout(() => {
      setIsAppReady(true);
      console.log('App is ready for navigation');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function checkAlarmTime() {
      if (!isAppReady) {
        console.log('App not ready for navigation, skipping alarm check');
        return;
      }
      
      try {
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) return;
        
        const alarms = JSON.parse(alarmsJson);
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const activeAlarm = alarms.find((alarm: any) => 
          alarm.enabled && alarm.time === currentTime
        );

        if (activeAlarm) {
          console.log('Active alarm found, opening alarm screen');
          
          // Schedule repeating notifications first
          await scheduleRepeatingAlarmNotifications(
            activeAlarm.id,
            activeAlarm.sound || 'Beacon',
            activeAlarm.soundVolume || 1,
            Boolean(activeAlarm.mission)
          );
          
          // Then navigate to the alarm screen
          router.push({
            pathname: '/alarm-ring',
            params: {
              alarmId: activeAlarm.id,
              sound: activeAlarm.sound || 'Beacon',
              soundVolume: activeAlarm.soundVolume || 1,
              hasMission: activeAlarm.mission ? 'true' : 'false'
            }
          });
        }
      } catch (error) {
        console.error('Error checking alarm time:', error);
      }
    }

    // Check when app opens
    checkAlarmTime();

    // Check when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAlarmTime();
      }
    });

    // Initial setup
    requestNotificationPermissions();
    registerBackgroundTask();

    // Setup notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    return () => {
      subscription.remove();
    };
  }, [isAppReady]);

  useEffect(() => {
    // Set app as ready after first render
    AsyncStorage.setItem('isAppReady', 'true');
    
    // Check for pending alarm navigation
    const checkPendingAlarm = async () => {
      const shouldNavigate = await AsyncStorage.getItem('shouldNavigateToAlarm');
      
      if (shouldNavigate === 'true') {
        const pendingAlarmJson = await AsyncStorage.getItem('pendingAlarm');
        
        if (pendingAlarmJson) {
          const pendingAlarm = JSON.parse(pendingAlarmJson);
          
          // Clear the pending navigation
          await AsyncStorage.removeItem('shouldNavigateToAlarm');
          await AsyncStorage.removeItem('pendingAlarm');
          
          // Navigate to alarm screen
          router.push({
            pathname: '/alarm-ring',
            params: pendingAlarm
          });
        }
      }
    };
    
    checkPendingAlarm();
  }, []);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        const isPremium = await AsyncStorage.getItem('isPremium');
        
        // If quiz is completed or user is premium, go to main app
        // Otherwise, show the quiz
        if (quizCompleted === 'true' || isPremium === 'true') {
          setInitialRoute('(tabs)');
        } else {
          setInitialRoute('quiz');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking first launch:', error);
        setInitialRoute('(tabs)'); // Default to main app on error
        setLoading(false);
      }
    };
    
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    // Setup notifications after the component is mounted
    const setup = async () => {
      try {
        await setupNotifications();
        console.log('Notifications setup complete');
      } catch (error) {
        console.error('Error setting up notifications:', error);
      } finally {
        // Mark as ready regardless of success/failure
        setIsReady(true);
      }
    };

    setup();
  }, []);

  if (!loaded || loading || !isReady) {
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
              headerShown: false,
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
          <Stack.Screen name="quiz/index" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/question1" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/question2" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/question3" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/question4" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/question5" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/payment" options={{ headerShown: false }} />
          <Stack.Screen name="alarm-ring" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="mission-alarm" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}