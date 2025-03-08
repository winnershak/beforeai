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
  scheduleAlarmNotification
} from './notifications';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './components/ErrorBoundary';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';
import { setupNotifications, scheduleRepeatingAlarmNotifications } from './notifications';
import './utils/expo-sensors-patch';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global flag to track if alarm is active
let isAlarmActive = false;

const handleError = (error: Error) => {
  console.log('Caught error:', error);
  // Log to analytics or handle gracefully
};

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
  const notificationHandlersSetup = useRef(false);

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
        
        // IMPORTANT: Don't check for current time and navigate to alarm screen
        // This is causing alarms to trigger immediately
        // Instead, just make sure alarms are scheduled properly
        
        for (const alarm of alarms) {
          if (alarm.enabled) {
            // Just ensure the alarm is scheduled, don't navigate
            await scheduleAlarmNotification(alarm);
          }
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
        // Only set up notification handlers once
        if (!notificationHandlersSetup.current) {
          setupNotificationHandlers();
          notificationHandlersSetup.current = true;
          console.log('Notification handlers set up');
        }
        
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

  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        // Check if user is premium or has completed quiz
        const isPremium = await AsyncStorage.getItem('isPremium');
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        
        // Only check permissions if user has completed onboarding
        if (isPremium === 'true' || quizCompleted === 'true') {
          const { status } = await Notifications.getPermissionsAsync();
          
          // Only redirect if permissions not granted AND not in quiz flow
          if (status !== 'granted' && initialRoute !== 'quiz' && initialRoute !== null) {
            // Check if we've already shown the permission screen recently
            const lastPrompt = await AsyncStorage.getItem('lastPermissionPrompt');
            const now = Date.now();
            
            // Only show once per day max
            if (!lastPrompt || (now - parseInt(lastPrompt)) > 86400000) {
              await AsyncStorage.setItem('lastPermissionPrompt', now.toString());
              router.replace('/screens/NotificationPermissionScreen');
            }
          }
        }
      } catch (error) {
        console.error('Error checking notification permissions:', error);
      }
    };
    
    // Only run this check if the app is fully ready
    if (isReady && initialRoute !== null) {
      checkNotificationPermissions();
    }
  }, [isReady, initialRoute]);

  useEffect(() => {
    // This will run when the app comes to the foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App has come to the foreground, stopping any alarm sounds');
        stopAlarmSound();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Also stop sounds when the component mounts (app starts)
    stopAlarmSound();

    // Clean up the subscription
    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded || loading || !isReady) {
    return null;
  }

  return (
    <ErrorBoundary onError={handleError}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
    </ErrorBoundary>
  );
}