import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { TaskManagerTaskBody } from 'expo-task-manager';

// Define interruption mode constants
const INTERRUPTION_MODE_IOS_DO_NOT_MIX = 1;
const INTERRUPTION_MODE_ANDROID_DO_NOT_MIX = 1;

const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Types
interface Alarm {
  id: string;
  time: string;
  days: string[];
  label?: string;
  sound: string;
  soundVolume: number;
  mission?: any;
}

// Sound management
let alarmSound: Awaited<ReturnType<typeof Audio.Sound.createAsync>>['sound'] | null = null;
// Track active sounds by alarm ID
const activeSounds: Record<string, Audio.Sound> = {};

// Define sound assets statically
const soundAssets = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

// Configure audio mode - make sure this runs at startup
const configureAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    console.log('Audio mode configured successfully');
  } catch (error) {
    console.error('Error configuring audio mode:', error);
  }
};

// Make sure this runs immediately
configureAudioMode().catch(console.error);

// Preload all sound assets at startup
const preloadSoundAssets = async () => {
  try {
    console.log('Preloading sound assets...');
    const assetPromises = Object.entries(soundAssets).map(async ([name, resource]) => {
      const asset = Asset.fromModule(resource);
      await asset.downloadAsync();
      console.log(`Preloaded sound: ${name}, URI: ${asset.uri}`);
      return { name, asset };
    });
    
    await Promise.all(assetPromises);
    console.log('All sound assets preloaded');
  } catch (error) {
    console.error('Error preloading sound assets:', error);
  }
};

// Run this at startup
preloadSoundAssets().catch(console.error);

// Register background task
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background task error:', error);
    return;
  }
  // No sound playback here.
});

// Register background fetch task
async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
      minimumInterval: 1,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.log("Task Register failed:", err);
  }
}
void registerBackgroundFetch();

// Add this at the top level
let notificationHandled = false;
let isAlarmActive = false;
let isHandlingNotification = false;
let lastNotificationId: string | null = null;

// Add these variables to track notification state
let continuousNotificationInterval: NodeJS.Timeout | null = null;
let isAppOpened = false;
let isSoundPlaying = false;

// Add this at the top level
let debugLoggingInterval: NodeJS.Timeout | null = null;

// Function to start debug logging
export const startDebugLogging = (alarmId: string) => {
  // Clear any existing interval
  if (debugLoggingInterval) {
    clearInterval(debugLoggingInterval);
  }
  
  console.log(`Starting debug logging for alarm: ${alarmId}`);
  
  // Get the start time
  const startTime = new Date();
  let counter = 0;
  
  // Set up interval to log every 5 seconds
  debugLoggingInterval = setInterval(async () => {
    counter++;
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    
    console.log(`[DEBUG LOG ${counter}] Time elapsed: ${elapsedSeconds}s since alarm triggered`);
    
    // Check scheduled notifications
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`[DEBUG LOG ${counter}] Scheduled notifications count: ${scheduledNotifications.length}`);
      
      // Log details of each scheduled notification
      scheduledNotifications.forEach((notification, index) => {
        console.log(`[DEBUG LOG ${counter}] Notification ${index + 1}:`, {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          data: notification.content.data,
          trigger: notification.trigger
        });
      });
    } catch (error) {
      console.error(`[DEBUG LOG ${counter}] Error checking scheduled notifications:`, error);
    }
    
    // Check if we're still in the alarm screen
    console.log(`[DEBUG LOG ${counter}] Is alarm still active? ${isAlarmActive ? 'Yes' : 'No'}`);
  }, 5000);
  
  console.log('Debug logging interval started');
};

// Function to stop debug logging
export const stopDebugLogging = () => {
  if (debugLoggingInterval) {
    clearInterval(debugLoggingInterval);
    debugLoggingInterval = null;
    console.log('Debug logging stopped');
  }
};

// Update the notification listener
Notifications.addNotificationReceivedListener((notification) => {
  if (notificationHandled) {
    console.log('Notification already handled, skipping');
    return;
  }
  
  notificationHandled = true;
  console.log('Handling notification:', notification);
  handleNotification(notification);
});

// Reset when notification is responded to
Notifications.addNotificationResponseReceivedListener((response) => {
  console.log('Notification response received:', response);
  notificationHandled = false;
});

// Update notification handler for foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Extract sound volume from notification data
    const soundVolume = notification.request.content.data?.soundVolume || 1;
    
    console.log('Notification received with volume:', soundVolume);
    
    try {
      // Set the device volume to the user's preferred level
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      // Then set the volume separately using the system volume control
      console.log(`Volume will be set when sound is created: ${soundVolume}`);
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

// Sound control functions
export async function stopAlarmSound(): Promise<void> {
  try {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
    }
  } catch (error) {
    console.error('Error stopping sound:', error);
  }
}

// Update the playAlarmSound function to ensure volume is applied correctly
export async function playAlarmSound(
  soundName: keyof typeof soundAssets,
  volume: number = 1
): Promise<void> {
  if (alarmSound !== null) {
    // If sound is already playing, just update the volume
    try {
      await alarmSound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      return;
    } catch (error) {
      console.error('Error updating sound volume:', error);
      // Continue to recreate the sound
    }
  }
  
  try {
    await stopAlarmSound();
    
    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    
    console.log(`Playing sound: ${soundName} at volume: ${volume}`);
    
    const soundFile = soundAssets[soundName as keyof typeof soundAssets];
    const { sound: audioSound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: true,
        isLooping: true,
        volume: Math.max(0, Math.min(1, volume)),
      }
    );
    
    // Set volume explicitly again to ensure it's applied
    await audioSound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    
    alarmSound = audioSound;
    await audioSound.playAsync();
    
    // Log the playback status to debug volume issues
    audioSound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded) {
        if (!status.isPlaying && status.shouldPlay) {
          console.log('Sound stopped unexpectedly, restarting...');
          await audioSound.playAsync();
        }
        console.log('Sound playback status:', {
          isPlaying: status.isPlaying,
          volume: status.volume,
          position: status.positionMillis,
          duration: status.durationMillis
        });
      }
    });
    
    console.log('Sound started playing');
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Request permissions at app startup
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Existing permission status:', existingStatus);

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false, // No critical alerts
          provideAppNotificationSettings: true,
        },
      });
      finalStatus = status;
      console.log('New permission status:', status);
    }

    if (finalStatus !== 'granted') {
      console.error('Permission not granted for notifications');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

async function getSoundPath(soundName: string) {
  try {
    const asset = Asset.fromModule(soundAssets[soundName as keyof typeof soundAssets]);
    await asset.downloadAsync();
    console.log('Sound asset details:', {
      name: soundName,
      uri: asset.uri,
      localUri: asset.localUri
    });
    return asset.localUri;
  } catch (error) {
    console.error('Error getting sound path:', error);
    return null;
  }
}

// Update the scheduleAlarmNotification function to use 10 notifications instead of 100
export async function scheduleAlarmNotification(alarm: Alarm) {
  try {
    // Request permissions first
    await requestNotificationPermissions();
    
    // Get current day and time
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Convert JavaScript day (0-6) to your app's format
    let appDayOfWeek;
    if (dayOfWeek === 0) {
      appDayOfWeek = "7"; // or "0" depending on your app's format
    } else {
      appDayOfWeek = dayOfWeek.toString();
    }
    
    // Check if this alarm should run today
    if (alarm.days && alarm.days.length > 0) {
      if (!alarm.days.includes(appDayOfWeek)) {
        console.log(`Alarm ${alarm.id} not scheduled for today (day ${appDayOfWeek})`);
        return null;
      }
    }
    
    // Parse the time
    const [hours, minutes] = alarm.time.split(':');
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If the time has already passed today, don't schedule
    let timeUntilAlarm = (alarmTime.getTime() - today.getTime()) / 1000;
    if (timeUntilAlarm <= 0) {
      console.log(`Alarm time ${alarm.time} has already passed today`);
      return null;
    }

    console.log(`Scheduling alarm for ${alarm.time}, which is in ${timeUntilAlarm} seconds`);
    
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Create different messages to prevent grouping
    const messages = [
      "Wake up! Your alarm is ringing.",
      "Time to get up! Tap to open.",
      "Your alarm is still going. Wake up!",
      "Don't miss your day! Wake up now.",
      "Alarm continues. Please wake up."
    ];
    
    // Schedule the initial notification and 9 follow-up notifications (10 total)
    const notificationIds = [];
    
    // Schedule 10 notifications
    for (let i = 0; i < 10; i++) {
      try {
        // Create a truly unique identifier
        const uniqueId = `${alarm.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${i}`;
        
        // Calculate time - first notification at alarm time, then every 10 seconds
        // Using longer intervals between notifications (10 seconds instead of 5)
        const secondsDelay = timeUntilAlarm + (i * 10);
        
        // Use different messages to avoid coalescing
        const messageIndex = i % messages.length;
        
        // Schedule with a date trigger
        const scheduledTime = new Date();
        scheduledTime.setSeconds(scheduledTime.getSeconds() + secondsDelay);
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          identifier: uniqueId,
          content: {
            title: i === 0 ? (alarm.label || 'Alarm') : `Wake Up! (${i+1})`,
            body: i === 0 ? 'Time to wake up!' : messages[messageIndex],
            sound: `${alarm.sound.toLowerCase()}.caf`,
            data: {
              alarmId: alarm.id,
              sound: alarm.sound,
              soundVolume: alarm.soundVolume,
              mission: alarm.mission,
              hasMission: Boolean(alarm.mission),
              isOneTimeAlarm: !alarm.days || alarm.days.length === 0,
              notificationIndex: i
            }
          },
          trigger: {
            type: 'date',
            date: scheduledTime,
          } as Notifications.DateTriggerInput
        });
        
        notificationIds.push(notificationId);
        
        console.log(`Scheduled notification ${i+1}/10 with ID: ${notificationId} for ${scheduledTime.toLocaleTimeString()}`);
      } catch (error) {
        console.error(`Error scheduling notification ${i+1}:`, error);
      }
    }
    
    console.log(`Scheduled ${notificationIds.length} notifications for alarm ${alarm.id}`);
    return notificationIds[0]; // Return the ID of the first notification
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return null;
  }
}

// Update any references to scheduleRepeatingAlarmNotifications to use scheduleAlarmNotification instead
// For example, in handleNotification:
export function handleNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  console.log('Handling notification with data:', data);

  // Just navigate to the appropriate screen
  setTimeout(() => {
    if (data.hasMission) {
      console.log('Mission alarm detected, routing to mission-alarm');
      router.push({
        pathname: '/mission-alarm',
        params: {
          alarmId: data.alarmId,
          sound: data.sound,
          mission: data.mission,
          soundVolume: data.soundVolume
        }
      });
    } else {
      console.log('Regular alarm detected, routing to alarm-ring');
      router.push({
        pathname: '/alarm-ring',
        params: data
      });
    }
  }, 100);
}

// Test notification function - completely revised
export const testNotificationIn5Seconds = async (alarm: any) => {
  try {
    console.log('Testing notification with alarm:', alarm);
    
    // Request permissions
    await requestNotificationPermissions();
    
    // Calculate a future time (5 seconds from now)
    const now = new Date();
    now.setSeconds(now.getSeconds() + 5);
    
    // Get the sound name from the alarm
    const soundName = alarm.sound || 'Beacon';
    console.log(`Using sound: ${soundName} for test notification`);
    
    // Schedule the notification with the exact same format as your working code
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Test Alarm',
        body: 'This is a test alarm notification',
        sound: `${soundName.toLowerCase()}.caf`,
        data: {
          alarmId: alarm.id,
          sound: soundName,
          soundVolume: alarm.soundVolume,
          mission: alarm.mission,
          hasMission: Boolean(alarm.mission)
        },
      },
      trigger: {
        type: 'date',
        date: now,
      } as Notifications.DateTriggerInput,
    });
    
    console.log('Test notification scheduled with ID:', notificationId, 'using sound:', `${soundName.toLowerCase()}.caf`);
    
    // Also play the sound directly as a fallback
    setTimeout(() => {
      playAlarmSound(soundName as keyof typeof soundAssets, alarm.soundVolume || 1);
    }, 5000);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    return null;
  }
}

// Add this function to cancel all notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
};

// Add function to reset alarm state
export function resetAlarmState() {
  isAlarmActive = false;
}

// Update the checkCurrentAlarms function
export async function checkCurrentAlarms() {
  try {
    // Check if app is ready for navigation
    const isAppReady = await AsyncStorage.getItem('isAppReady');
    if (isAppReady !== 'true') {
      console.log('App not ready for navigation, skipping alarm check');
      return;
    }

    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (!alarmsJson) return;

    const alarms = JSON.parse(alarmsJson);
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentSeconds = now.getSeconds();

    // Find alarm that matches current time
    const currentAlarm = alarms.find((alarm: any) => {
      return alarm.time === currentTime && currentSeconds < 3; // Only trigger in first 3 seconds of the minute
    });
    
    // Only navigate if we found a matching alarm
    if (currentAlarm) {
      console.log('Found matching alarm:', currentAlarm);
      
      // Store the alarm info for later navigation
      await AsyncStorage.setItem('pendingAlarm', JSON.stringify({
        alarmId: currentAlarm.id,
        hasMission: currentAlarm.mission ? 'true' : 'false',
        sound: currentAlarm.sound,
        soundVolume: currentAlarm.soundVolume
      }));
      
      // Set a flag that the app should navigate to the alarm screen
      await AsyncStorage.setItem('shouldNavigateToAlarm', 'true');
    }
  } catch (error) {
    console.error('Error checking alarm time:', error);
  }
}

// Modify the interval to avoid navigation errors
// Don't start the interval immediately, wait for app to be ready
let alarmCheckInterval: NodeJS.Timeout | null = null;

export function startAlarmCheckInterval() {
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
  }
  
  const checkInterval = 10000; // Check every 10 seconds
  alarmCheckInterval = setInterval(checkCurrentAlarms, checkInterval);
  console.log('Started alarm check interval');
}

// Add a function to ensure audio is configured properly
export const ensureAudioConfiguration = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    console.log('Audio mode configured for alarms');
    return true;
  } catch (error) {
    console.error('Error configuring audio mode:', error);
    return false;
  }
};

// Add this to your app initialization
export const initializeNotifications = async () => {
  // Request permissions with specific iOS settings
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: true,
    },
  });
  
  if (status !== 'granted') {
    console.log('Notification permissions not granted');
  }
  
  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  
  // Ensure audio is configured properly
  await ensureAudioConfiguration();
  
  console.log('Notifications initialized');
};

// Update the continuous notifications implementation
export const startContinuousNotifications = async (
  alarmId: string,
  sound: string,
  soundVolume: number,
  hasMission: boolean
) => {
  console.log('Starting continuous notifications for alarm:', alarmId);
  
  // Set alarm as active
  isAlarmActive = true;
  
  // Schedule the first notification immediately
  await scheduleSingleNotification(alarmId, sound, soundVolume, hasMission);
  
  // Set up interval to keep sending notifications until app is opened
  if (continuousNotificationInterval) {
    clearInterval(continuousNotificationInterval);
  }
  
  continuousNotificationInterval = setInterval(async () => {
    if (isAlarmActive && !isHandlingNotification) {
      console.log('Alarm still active, sending another notification');
      await scheduleSingleNotification(alarmId, sound, soundVolume, hasMission);
    } else {
      console.log('Alarm no longer active or notification being handled, stopping');
      stopContinuousNotifications();
    }
  }, 10000); // Send a new notification every 10 seconds
  
  console.log('Continuous notification interval set up');
};

// Function to schedule a single notification
const scheduleSingleNotification = async (
  alarmId: string,
  sound: string,
  soundVolume: number,
  hasMission: boolean
) => {
  try {
    isHandlingNotification = true;
    console.log('Scheduling single notification with sound:', sound);
    
    // Create a unique identifier for this notification
    const notificationId = `alarm_${alarmId}_${Date.now()}`;
    lastNotificationId = notificationId;
    
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule notification immediately
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'Wake Up!',
        body: 'Your alarm is still ringing. Tap to open.',
        sound: `${sound.toLowerCase()}.caf`,
        data: {
          alarmId,
          sound,
          soundVolume,
          hasMission,
          isContinuous: true,
          notificationId
        },
      },
      trigger: null, // Send immediately
    });
    
    console.log('Scheduled notification with ID:', notificationId);
    
    // Reset handling flag after a short delay
    setTimeout(() => {
      isHandlingNotification = false;
    }, 5000);
  } catch (error) {
    console.error('Error scheduling continuous notification:', error);
    isHandlingNotification = false;
  }
};

// Function to stop continuous notifications
export const stopContinuousNotifications = () => {
  if (continuousNotificationInterval) {
    clearInterval(continuousNotificationInterval);
    continuousNotificationInterval = null;
    isAlarmActive = false;
    console.log('Stopped continuous notifications');
  }
};

// Mark app as opened when user interacts with notification
export const markAppAsOpened = () => {
  isAppOpened = true;
  stopContinuousNotifications();
};

// Update the notification handler to start continuous notifications
export function handleAlarmNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  console.log('Handling alarm notification with data:', data);

  // Start continuous notifications if this is the first notification
  if (!data.isContinuous) {
    console.log('Starting continuous notifications for first alarm notification');
    startContinuousNotifications(
      data.alarmId,
      data.sound,
      data.soundVolume,
      data.hasMission
    );
  } else {
    console.log('Received continuous notification:', data.notificationId);
  }

  // Navigate to the appropriate screen
  if (data.hasMission) {
    console.log('Navigating to mission screen');
    router.push({
      pathname: '/mission-alarm',
      params: {
        alarmId: data.alarmId,
        sound: data.sound,
        mission: JSON.stringify(data.mission),
        soundVolume: data.soundVolume
      }
    });
  } else {
    console.log('Navigating to alarm screen');
    router.push({
      pathname: '/alarm-ring',
      params: {
        alarmId: data.alarmId,
        sound: data.sound,
        soundVolume: data.soundVolume
      }
    });
  }
}

// Add this function to set up the notification response handler
export function setupNotificationResponseHandler() {
  // Set up notification response handler
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    const data = response.notification.request.content.data;
    
    // If this is an alarm notification, handle it
    if (data && data.alarmId) {
      console.log('Handling alarm notification response');
      
      // Schedule repeating notifications
      scheduleAlarmNotification(data as Alarm);
      
      // Navigate to the appropriate screen
      if (data.hasMission) {
        router.push({
          pathname: '/mission-alarm',
          params: {
            alarmId: data.alarmId,
            sound: data.sound,
            mission: data.mission,
            soundVolume: data.soundVolume
          }
        });
      } else {
        router.push({
          pathname: '/alarm-ring',
          params: {
            alarmId: data.alarmId,
            sound: data.sound,
            soundVolume: data.soundVolume
          }
        });
      }
    }
  });
  
  return responseListener;
}

// Update the setupNotifications function to call this
export function setupNotifications() {
  // Configure audio mode
  configureAudioMode();
  
  // Set up notification handler for foreground notifications
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log('Received notification in foreground');
      
      // If this is an alarm notification, handle it
      const data = notification.request.content.data;
      if (data && data.alarmId) {
        // Schedule repeating notifications
        scheduleAlarmNotification(data as Alarm);
      }
      
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
  
  // Set up response handler
  setupNotificationResponseHandler();
}

// Add this function to cancel a specific alarm notification
export const cancelAlarmNotification = async (alarmId: string) => {
  try {
    // Cancel all notifications with this alarm ID prefix
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find notifications for this alarm
    const alarmNotifications = scheduledNotifications.filter(
      notification => notification.identifier.startsWith(`alarm_${alarmId}`)
    );
    
    // Cancel each notification
    for (const notification of alarmNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Cancelled notification with ID: ${notification.identifier}`);
    }
    
    console.log(`Cancelled all notifications for alarm: ${alarmId}`);
  } catch (error) {
    console.error(`Error cancelling notifications for alarm ${alarmId}:`, error);
  }
};

// Add this to your alarm-ring screen's stop alarm function
export const stopAlarm = () => {
  isAlarmActive = false;
  stopDebugLogging();
  // Your existing code to stop the alarm...
};

// Set up notification handler for background notifications
TaskManager.defineTask('BACKGROUND_NOTIFICATION_TASK', async ({ data, error }: TaskManagerTaskBody) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  
  // Extract notification data with proper type casting
  const notificationData = (data as any).notification?.request?.content?.data;
  
  if (!notificationData) {
    console.error('No notification data found in background task');
    return;
  }
  
  console.log('Background notification received:', notificationData);
  
  // If this is the initial alarm notification, schedule the repeating notifications
  if (notificationData.isInitialAlarm) {
    console.log('Initial alarm notification received in background, scheduling repeating notifications');
    await scheduleAlarmNotification(notificationData as Alarm);
  }
});

// Register the background task
Notifications.registerTaskAsync('BACKGROUND_NOTIFICATION_TASK');

// Add this function back temporarily to prevent errors
export const scheduleRepeatingAlarmNotifications = async (
  alarmId: string,
  sound: string,
  soundVolume: number,
  hasMission: boolean
) => {
  console.log('scheduleRepeatingAlarmNotifications was called - this should be replaced with scheduleAlarmNotification');
  
  // Create a dummy alarm object to pass to scheduleAlarmNotification
  const dummyAlarm: Alarm = {
    id: alarmId,
    time: '00:00', // This won't be used since we're just forwarding the call
    days: [],
    sound: sound,
    soundVolume: soundVolume,
    mission: hasMission ? {} : undefined
  };
  
  // Forward to the correct function
  return scheduleAlarmNotification(dummyAlarm);
};