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
import * as Linking from 'expo-linking';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';
import { setupAlarms, scheduleAlarmNotification as setupAlarmsScheduleAlarmNotification } from './notifications';
import './utils/expo-sensors-patch';
import RevenueCatService from './services/RevenueCatService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
  const [hasNavigatedToAlarm, setHasNavigatedToAlarm] = useState(false);
  const alarmTimers = useRef<{[key: string]: NodeJS.Timeout}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

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
            await setupAlarmsScheduleAlarmNotification(alarm);
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
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Check if there's a completed alarm flag for the active alarm
        const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
        if (activeAlarmJson) {
          const activeAlarm = JSON.parse(activeAlarmJson);
          const completedAlarmsJson = await AsyncStorage.getItem('completedAlarms');
          const completedAlarms = completedAlarmsJson ? JSON.parse(completedAlarmsJson) : {};
          
          // If this alarm has been completed, clear the active alarm
          if (completedAlarms[activeAlarm.alarmId]) {
            console.log(`Alarm ${activeAlarm.alarmId} has been completed, clearing active alarm`);
            await AsyncStorage.removeItem('activeAlarm');
            await AsyncStorage.removeItem('alarmRingActive');
          }
        }
        
        // Just stop any sounds and continue normal app flow
        stopAlarmSound();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const registerBackgroundTasks = async () => {
      try {
        await BackgroundFetch.registerTaskAsync('ALARM_TASK', {
          minimumInterval: 60, // 1 minute minimum
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        console.log('Background tasks registered successfully');
      } catch (error) {
        console.error('Error registering background tasks:', error);
      }
    };
    
    registerBackgroundTasks();
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // Parse the URL
      const { path, queryParams } = Linking.parse(url);
      
      // If this is an alarm-ring deep link, handle it
      if (path === 'alarm-ring') {
        console.log('Handling alarm-ring deep link with params:', queryParams);
        
        // Navigate to alarm-ring screen with type safety
        router.replace({
          pathname: '/alarm-ring',
          params: queryParams || {} // Add fallback to empty object if queryParams is null
        });
      }
    };
    
    // Add the event listener
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const checkPremiumAccess = async () => {
      try {
        // Check premium status from AsyncStorage only
        const isPremium = await AsyncStorage.getItem('isPremium');
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        
        // Set state first
        setIsPremium(isPremium === 'true');
        setIsLoading(false);
        
        // Store the navigation target, but don't navigate yet
        if (quizCompleted !== 'true' && isPremium !== 'true') {
          setInitialRoute('/quiz');
        }
      } catch (error) {
        console.error('Error in premium access check:', error);
        setIsLoading(false);
      }
    };

    checkPremiumAccess();
  }, []);

  // Add this effect to handle navigation after the component is mounted
  useEffect(() => {
    if (!isLoading && initialRoute && isAppReady) {
      // Now it's safe to navigate
      router.replace(initialRoute);
    }
  }, [isLoading, initialRoute, isAppReady]);

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
            <Stack.Screen 
              name="snooze-confirmation" 
              options={{
                headerShown: false,
                presentation: 'modal',
                gestureEnabled: false, // Prevent swiping to dismiss
                animation: 'fade',
              }} 
            />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}