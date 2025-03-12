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
import { setupAlarms, scheduleAlarmNotification as setupAlarmsScheduleAlarmNotification } from './notifications';
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
  const [hasNavigatedToAlarm, setHasNavigatedToAlarm] = useState(false);

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

  useEffect(() => {
    // Update the checkForActiveAlarms function in _layout.tsx
    async function checkForActiveAlarms() {
      try {
        console.log('Checking for active alarms on app open...');
        
        // Get all alarms
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) return;
        
        const alarms = JSON.parse(alarmsJson);
        const now = new Date();
        
        // Check if there's already an active alarm being displayed
        const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
        if (activeAlarmJson) {
          console.log('Active alarm found, navigating to alarm-ring screen');
          const activeAlarm = JSON.parse(activeAlarmJson);
          
          // Navigate to alarm ring screen with the active alarm data
          router.replace({
            pathname: '/alarm-ring',
            params: {
              alarmId: activeAlarm.alarmId,
              sound: activeAlarm.sound || 'Beacon',
              soundVolume: activeAlarm.soundVolume || 1,
              hasMission: activeAlarm.hasMission ? 'true' : 'false'
            }
          });
          return;
        }
        
        // Check each alarm to see if it should be ringing now
        for (const alarm of alarms) {
          if (!alarm.enabled) continue;
          
          // Parse alarm time
          const [hours, minutes] = alarm.time.split(':').map(Number);
          
          // Get current day of week (0-6, where 0 is Sunday)
          const currentDay = now.getDay();
          // Convert to 1-7 format where 1 is Monday and 7 is Sunday
          const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
          
          // Check if alarm is scheduled for today
          if (alarm.days.length > 0 && !alarm.days.includes(currentDayAdjusted.toString())) {
            continue;
          }
          
          // Create date objects for alarm time today
          const alarmTime = new Date(now);
          alarmTime.setHours(hours, minutes, 0, 0);
          
          // Check if alarm should be ringing now (within the last 5 minutes)
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          if (alarmTime >= fiveMinutesAgo && alarmTime <= now) {
            console.log(`Alarm ${alarm.id} should be ringing now!`);
            
            // Save as active alarm
            const activeAlarmData = {
              alarmId: alarm.id,
              timestamp: now.getTime(),
              sound: alarm.sound || 'Beacon',
              soundVolume: alarm.soundVolume || 1,
              hasMission: alarm.mission ? true : false
            };
            
            await AsyncStorage.setItem('activeAlarm', JSON.stringify(activeAlarmData));
            
            // Navigate to alarm ring screen
            router.replace({
              pathname: '/alarm-ring',
              params: {
                alarmId: alarm.id,
                sound: alarm.sound || 'Beacon',
                soundVolume: alarm.soundVolume || 1,
                hasMission: alarm.mission ? 'true' : 'false'
              }
            });
            
            // Only trigger one alarm at a time
            break;
          }
        }
      } catch (error) {
        console.error('Error checking for active alarms:', error);
      }
    }

    // Run the check immediately when the app is ready
    if (isAppReady) {
      // Run the check immediately
      checkForActiveAlarms();
      
      // Also check when app state changes to active
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          console.log('App came to foreground, checking for active alarms');
          checkForActiveAlarms();
        }
      });
      
      return () => {
        subscription.remove();
      };
    }
    
    return undefined;
  }, [isAppReady]);

  // Add this function to check for alarms that should be triggered now
  async function checkCurrentAlarms() {
    try {
      console.log('Checking for alarms that should be triggered now...');
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) return;
      
      const alarms = JSON.parse(alarmsJson);
      const now = new Date();
      
      // Check if there's already an active alarm
      const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
      if (activeAlarmJson) {
        console.log('There is already an active alarm, not triggering another one');
        return;
      }
      
      // Find alarms that should be triggered
      for (const alarm of alarms) {
        if (!alarm.enabled) continue;
        
        // Check if this alarm should ring now
        const shouldRing = await shouldAlarmRingNow(alarm, now, 0);
        
        if (shouldRing) {
          console.log(`Alarm ${alarm.id} should ring now`);
          
          // Cancel all notifications since we're showing the alarm screen
          await Notifications.cancelAllScheduledNotificationsAsync();
          
          // Navigate to alarm ring screen
          router.replace({
            pathname: '/alarm-ring',
            params: {
              alarmId: alarm.id,
              sound: alarm.sound || 'Beacon',
              soundVolume: alarm.soundVolume || 1,
              hasMission: alarm.mission ? 'true' : 'false'
            }
          });
          
          // Only trigger one alarm at a time
          break;
        }
      }
    } catch (error) {
      console.error('Error checking for current alarms:', error);
    }
  }

  // Helper function to determine if an alarm should ring now
  const shouldAlarmRingNow = async (alarm: {
    id: string;
    time: string;
    enabled: boolean;
    days: string[];
    sound?: string;
    soundVolume?: number;
    mission?: any;
  }, now: Date, lastCheckTime: number): Promise<boolean> => {
    try {
      // Parse alarm time
      const [hours, minutes] = alarm.time.split(':').map(Number);
      
      // Get current day of week (0-6, where 0 is Sunday)
      const currentDay = now.getDay();
      // Convert to 1-7 format where 1 is Monday and 7 is Sunday
      const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
      
      // Check if alarm is scheduled for today
      if (!alarm.days.includes(currentDayAdjusted.toString())) {
        return false;
      }
      
      // Create date objects for alarm time today
      const alarmTime = new Date(now);
      alarmTime.setHours(hours, minutes, 0, 0);
      
      // Get alarm timestamp
      const alarmTimestamp = alarmTime.getTime();
      
      // Check if alarm time is between last check and now
      // This ensures we only trigger alarms that have just become due
      if (alarmTimestamp > lastCheckTime && alarmTimestamp <= now.getTime()) {
        // Check if this alarm has already been triggered recently
        const triggeredAlarmsJson = await AsyncStorage.getItem('triggeredAlarms');
        const triggeredAlarms = triggeredAlarmsJson ? JSON.parse(triggeredAlarmsJson) : {};
        
        // If this alarm was triggered in the last hour, don't trigger again
        if (triggeredAlarms[alarm.id]) {
          const lastTriggered = triggeredAlarms[alarm.id];
          const oneHourAgo = now.getTime() - (60 * 60 * 1000);
          
          if (lastTriggered > oneHourAgo) {
            return false;
          }
        }
        
        // Mark this alarm as triggered
        triggeredAlarms[alarm.id] = now.getTime();
        await AsyncStorage.setItem('triggeredAlarms', JSON.stringify(triggeredAlarms));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if alarm should ring:', error);
      return false;
    }
  };

  // Update the interval setup
  useEffect(() => {
    if (isAppReady) {
      // Check immediately when app is ready
      checkCurrentAlarms();
      
      // Then check every minute
      const interval = setInterval(() => {
        // Only check if there's no active alarm
        AsyncStorage.getItem('activeAlarm').then(activeAlarmJson => {
          if (!activeAlarmJson) {
            checkCurrentAlarms();
          }
        }).catch(error => {
          console.error('Error checking active alarm:', error);
        });
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [isAppReady]);

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