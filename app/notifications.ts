import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { TaskManagerTaskBody } from 'expo-task-manager';
import { AppState, AppStateStatus } from 'react-native';
import AlarmSoundModule from './native-modules/AlarmSoundModule';



// Add these variables back at the top level
let isAlarmActive = false;
let isHandlingNotification = false;
let lastNotificationId: string | null = null;
let continuousNotificationInterval: NodeJS.Timeout | null = null;

// Add these variables for the gentle wake-up feature
let currentGentleWakeupVolume = 0;
let gentleWakeupInterval: NodeJS.Timeout | null = null;
const MAX_VOLUME_STEPS = 10; // Number of steps to reach full volume

// Add this at the top of your file, after imports
declare global {
  var currentAlarmSound: Audio.Sound | null;
}

// Then in your code, initialize it if needed
global.currentAlarmSound = global.currentAlarmSound || null;

// Define interruption mode constants
const INTERRUPTION_MODE_IOS_DO_NOT_MIX = 1;
const INTERRUPTION_MODE_ANDROID_DO_NOT_MIX = 1;

const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Types
interface Alarm {
  id: string;
  time: string;
  label?: string;
  sound: string;
  soundVolume: number;
  mission?: any;
}

// Sound management
let alarmSound: Awaited<ReturnType<typeof Audio.Sound.createAsync>>['sound'] | null = null;
// Track active sounds by alarm ID
const activeSounds: Record<string, Audio.Sound> = {};

// Define sound assets (for both sleep sounds and alarm sounds)
const soundAssets = {
  'beacon': require('../assets/sounds/beacon.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'), // Add both capitalizations to be safe
  'radar': require('../assets/sounds/radar.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'chimes': require('../assets/sounds/chimes.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'circuit': require('../assets/sounds/circuit.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'reflection': require('../assets/sounds/reflection.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
  'orkney': require('../assets/sounds/orkney.caf'),
  'Orkney': require('../assets/sounds/orkney.caf'),
};

// First, add a sound cache to prevent repeated loading/unloading
const soundCache = new Map();

// Improved sound loading function
export const loadSound = async (soundName: string) => {
  try {
    // Handle undefined or invalid sound names
    if (!soundName || !Object.keys(soundAssets).some(name => name.toLowerCase() === soundName.toLowerCase())) {
      console.log('Invalid sound requested, not using any fallback sound');
      return null;
    }
    
    // Check if sound is already in cache
    if (soundCache.has(soundName)) {
      return soundCache.get(soundName);
    }
    
    // Load the sound
    console.log(`Loading sound: ${soundName}`);
    const { sound } = await Audio.Sound.createAsync(
      soundName in soundAssets 
        ? soundAssets[soundName as keyof typeof soundAssets] 
        : soundAssets['Beacon']
    );
    
    // Store in cache
    soundCache.set(soundName, sound);
    return sound;
  } catch (error) {
    console.error(`Error loading sound ${soundName}:`, error);
    return null;
  }
};

// Improved sound playing function
export const playSound = async (soundName: string, volume = 1.0) => {
  try {
    // Get or load the sound
    let sound = soundCache.get(soundName);
    
    if (!sound) {
      sound = await loadSound(soundName);
      if (!sound) return null;
    }
    
    // Reset the sound to the beginning
    await sound.setPositionAsync(0);
    
    // Set volume
    await sound.setVolumeAsync(volume);
    
    // Play the sound
    await sound.playAsync();
    
    return sound;
  } catch (error) {
    console.error(`Error playing sound ${soundName}:`, error);
    return null;
  }
};

// Safe sound cleanup function
export const cleanupSound = async (sound: Audio.Sound | null) => {
  if (!sound) return;
  
  try {
    // Check if sound is loaded before unloading
    const status = await sound.getStatusAsync();
    
    if (status.isLoaded) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  } catch (error: unknown) {
    // Only log if it's not the "not loaded" error
    if (!((error as Error).message?.includes('not loaded'))) {
      console.error('Error cleaning up sound:', error);
    }
  }
};

// Improve the sound loading and playing process
export const playAlarmSound = async (soundName: string, soundVolume: number) => {
  try {
    console.log(`Starting to play alarm sound: ${soundName} at volume ${soundVolume}`);
    isAlarmActive = true;
    
    // First cancel all other notifications to prevent more sounds
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Use native module for iOS, keep JS implementation for Android
    if (Platform.OS === 'ios') {
      return AlarmSoundModule.playAlarmSound(soundName, soundVolume);
    } else {
      // Android implementation...
    }
  } catch (error) {
    console.error('Error in playAlarmSound:', error);
    throw error;
  }
};

// Update the stopAlarmSound function to ensure complete cleanup
export const stopAlarmSound = async () => {
  try {
    // Check if alarm screen is showing
    const alarmScreenShowing = await AsyncStorage.getItem('alarmScreenShowing');
    if (alarmScreenShowing === 'true') {
      console.log('Alarm screen is showing - not stopping sound from notifications.ts');
      return;
    }
    
    console.log('Stopping alarm sound');
    isAlarmActive = false;
    
    // First, stop all sounds in the cache
    for (const [soundName, sound] of soundCache.entries()) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      } catch (e) {
        console.error(`Error stopping cached sound ${soundName}:`, e);
      }
    }
    
    // Clear the sound cache
    soundCache.clear();
    
    // If there's a global sound, stop and unload it
    if (global.currentAlarmSound) {
      try {
        const status = await global.currentAlarmSound.getStatusAsync();
        if (status.isLoaded) {
          await global.currentAlarmSound.stopAsync();
          await global.currentAlarmSound.unloadAsync();
        }
      } catch (e) {
        // Ignore errors if sound is already unloaded
      }
      
      global.currentAlarmSound = null;
    }
    
    // Use native module on iOS
    if (Platform.OS === 'ios') {
      await AlarmSoundModule.stopAlarmSound();
      console.log('Native sound stopped');
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping sound:', error);
    return false;
  }
};

// Configure audio mode - make sure this runs at startup
const configureAudioMode = async () => {
  try {
    // Let the native module handle all iOS audio configuration
    if (Platform.OS === 'ios') {
      // iOS audio configuration is handled by the native module
      console.log('Using native module for iOS audio configuration');
    } else {
      // Configure Android audio only
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('Android audio mode configured');
    }
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
  console.log('Handling notification:', notification);
  handleNotification(notification);
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

// Add this function to request permissions only when needed
export const requestNotificationPermissions = async () => {
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return result.status === 'granted';
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

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

// Add these variables to track app state
let appState: AppStateStatus = 'active';
let backgroundTaskRegistered = false;

// Add this function to register a background task for alarms
const registerBackgroundAlarmTask = async () => {
  if (backgroundTaskRegistered) return;
  
  try {
    // Define the background task
    TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
      console.log('Background alarm check running');
      
      // Check if there are any active alarms
      if (isAlarmActive) {
        console.log('Active alarm detected in background, sending notification');
        
        // Get the last notification data
        const lastNotificationData = await AsyncStorage.getItem('lastAlarmNotificationData');
        if (lastNotificationData) {
          const data = JSON.parse(lastNotificationData);
          
          // Schedule a new notification
          await scheduleAlarmNotification({
            id: data.alarmId,
            time: "00:00", // This won't matter for immediate notifications
            sound: data.sound,
            soundVolume: data.soundVolume || 1,
            mission: data.mission
          });
          
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }
      }
      
      return BackgroundFetch.BackgroundFetchResult.NoData;
    });
    
    // Register the background task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
      minimumInterval: 30, // Run at least every 30 seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    backgroundTaskRegistered = true;
    console.log('Background alarm task registered');
  } catch (error) {
    console.error('Error registering background alarm task:', error);
  }
};

// Add an app state change listener
const setupAppStateListener = () => {
  AppState.addEventListener('change', handleAppStateChange);
  console.log('App state listener set up');
};

// Handle app state changes
const handleAppStateChange = async (nextAppState: AppStateStatus) => {
  console.log(`App state changed from ${appState} to ${nextAppState}`);
  
  // If app is going to background and there's an active alarm
  if (appState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
    if (isAlarmActive) {
      console.log('App going to background with active alarm, ensuring notifications continue');
      await registerBackgroundAlarmTask();
    }
  }
  
  // Update the current app state
  appState = nextAppState;
};

// Update the scheduleAlarmNotification function to create 15 backup notifications
export const scheduleAlarmNotification = async (alarm: Alarm) => {
  try {
    // Request permissions only when scheduling an alarm
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }
    
    // Generate a unique notification ID for this alarm if not provided
    const notificationId = alarm.id ? `notification_${alarm.id}_${Date.now()}` : `notification_${Date.now()}`;
    console.log(`Creating notification with unique ID: ${notificationId}`);
    
    // Extract time parts
    const [hours, minutes] = alarm.time.split(':').map(Number);
    
    // Create date objects for scheduling
    const now = new Date();
    let scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If the scheduled time is in the past, add a day
    if (scheduledDate < now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    console.log(`Scheduling notification for: ${scheduledDate.toLocaleString()}`);
    
    // Cancel any existing notification for this alarm
    if (alarm.id) {
      await cancelAlarmNotification(alarm.id);
    }
    
    // Schedule the actual notification with the unique ID
    const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Wake Up!',
        body: 'Time to wake up!',
        badge: 0,  // Set to 0 to avoid badge
        categoryIdentifier: 'alarmV2',
        data: {
          alarmId: alarm.id,
          sound: alarm.sound,
          soundVolume: alarm.soundVolume,
          mission: alarm.mission,
          fromNotification: true,
        },
      },
      trigger: {
        date: scheduledDate,
        type: 'date'
      } as Notifications.DateTriggerInput,
    });
    
    console.log(`Scheduled notification with ID: ${scheduledNotificationId} for ${scheduledDate.toLocaleString()}`);
    
    // Schedule 15 backup notifications (one every 6 seconds for 90 seconds)
    // This ensures the alarm will keep trying if the user doesn't respond
    for (let i = 1; i <= 15; i++) {
      const backupTrigger = {
        date: new Date(scheduledDate.getTime() + (i * 6000)), // 6 seconds apart
        type: 'date'
      } as Notifications.DateTriggerInput;
      
      const backupNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Wake Up!',
          body: alarm.label ? `${alarm.label} is still ringing (${i})` : `Your alarm is still ringing (${i})`,
          sound: `${alarm.sound.toLowerCase()}.caf`,
          categoryIdentifier: 'alarmV2',
          data: {
            alarmId: alarm.id,
            sound: alarm.sound,
            soundVolume: alarm.soundVolume,
            mission: alarm.mission,
            hasMission: Boolean(alarm.mission),
            fromNotification: 'true'
          },
        },
        trigger: backupTrigger,
      });
      
      console.log(`Scheduled backup notification ${i} with ID: ${backupNotificationId} for ${new Date(scheduledDate.getTime() + (i * 6000)).toLocaleString()}`);
    }
    
    return scheduledNotificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Update the handleNotification function to remove navigation to alarm-ring
export function handleNotification(notification: Notifications.Notification) {
  try {
    // Extract alarm data from notification
    const data = notification.request.content.data;
    console.log('Handling notification with data:', data);
    
    // Check if we're already handling an alarm - prevent double sounds
    if (isHandlingNotification) {
      console.log('Already handling a notification, ignoring duplicate');
      return;
    }
    isHandlingNotification = true;
    
    // Only handle notifications that are from actual alarms
    if (!data.fromNotification || data.fromNotification !== 'true') {
      console.log('Ignoring notification that is not from an alarm trigger');
      return;
    }
    
    console.log('Handling legitimate alarm notification');
    
    // Set alarm as active
    isAlarmActive = true;
    
    // Cancel all other notifications immediately
    Notifications.cancelAllScheduledNotificationsAsync().catch(error => {
      console.error('Error cancelling notifications:', error);
    });
    
    // Load and play the alarm sound
    if (data.sound && !global.currentAlarmSound) {
      console.log('Starting to play alarm sound:', data.sound, 'at volume', data.soundVolume || 1);
      playAlarmSound(data.sound, data.soundVolume || 1);
    }
    
    // Store the alarm data in AsyncStorage for recovery
    AsyncStorage.setItem('currentAlarmData', JSON.stringify({
      alarmId: data.alarmId,
      sound: data.sound,
      soundVolume: data.soundVolume,
      hasMission: data.hasMission,
      mission: data.mission,
      timestamp: Date.now()
    })).catch(err => console.error('Error storing alarm data:', err));
    
    // Reset handling flag when done
    setTimeout(() => {
      isHandlingNotification = false;
    }, 1000);
  } catch (error) {
    console.error('Error handling notification:', error);
    isHandlingNotification = false;
  }
}

// Function to cancel notifications for a specific alarm only
export const cancelAlarmNotification = async (alarmId: string) => {
  try {
    console.log(`Cancelling notifications for alarm: ${alarmId}`);
    
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter notifications related to this alarm
    const alarmNotifications = scheduledNotifications.filter(notification => {
      try {
        const data = notification.content.data as any;
        return data && data.alarmId === alarmId;
      } catch (e) {
        return false;
      }
    });
    
    // Cancel only this alarm's notifications by their identifiers
    for (const notification of alarmNotifications) {
      if (notification.identifier) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled notification: ${notification.identifier}`);
      }
    }
    
    console.log(`Cancelled ${alarmNotifications.length} notifications for alarm: ${alarmId}`);
    
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// Add this function to set up notification handlers
export const setupNotificationHandlers = async () => {
  // Configure notification handler for maximum prominence
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Add notification received handler
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received!', notification);
  });

  // Add notification response received handler
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response received!', response);
    handleNotification(response.notification);
  });

  console.log('Notification handlers set up successfully');
};

// Add a separation between notification setup and permission request
export const initializeAlarmSystem = async (skipPermissions = false) => {
  // Set up notification handlers without any permission requests
  await setupNotificationHandlers();
  
  // Configure audio
  await configureAudioMode();
  
  // Set up app state listener
  setupAppStateListener();
  
  // Only register background tasks when explicitly requested
  if (skipPermissions === false) { // Be explicit to ensure it's truly false
    await registerBackgroundAlarmTask();
  }
  
  console.log('Alarm system initialized without permission requests');
};

// The app should call this at startup
export const setupAlarms = () => {
  // Always skip permissions at startup
  initializeAlarmSystem(true).catch(error => {
    console.error('Error initializing alarm system:', error);
  });
};

// Add this function to reset the alarm state
export const resetAlarmState = () => {
  console.log('Resetting alarm state');
  
  // Reset alarm active flag
  isAlarmActive = false;
  
  // Clear any continuous notification interval
  if (continuousNotificationInterval) {
    clearInterval(continuousNotificationInterval);
    continuousNotificationInterval = null;
  }
  
  // Clear any gentle wakeup interval
  if (gentleWakeupInterval) {
    clearInterval(gentleWakeupInterval);
    gentleWakeupInterval = null;
  }
  
  // Reset volume
  currentGentleWakeupVolume = 0;
  
  console.log('Alarm state reset successfully');
};

// Add this function to cancel all notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
    return true;
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
    return false;
  }
};

// Update the scheduleImmediateNotification function
export const scheduleImmediateNotification = async (data: any) => {
  try {
    // Create a data object first
    const notificationData: any = {
      id: data.alarmId,
      time: "00:00", // This won't matter for immediate notifications
      sound: data.sound,
      soundVolume: data.soundVolume || 1,
      mission: data.mission
    };
    
    // Create notification content
    const content: Notifications.NotificationContentInput = {
      title: data.title,
      body: data.body,
      data: notificationData,
    };
    
    // Rest of the function...
    return null; // Add a return statement
  } catch (error) {
    console.error('Error scheduling immediate notification:', error);
    return null;
  }
};

// Add this export function after the cancelAllNotifications function
export const stopNotificationsWhenAppOpens = async () => {
  try {
    // Cancel all pending notifications when app opens
    await cancelAllNotifications();
    
    // If there's an active alarm (shown in UI), don't need notifications
    const activeAlarmData = await AsyncStorage.getItem('activeAlarm');
    if (activeAlarmData) {
      console.log('App opened with active alarm, cancelling notifications');
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping notifications when app opens:', error);
    return false;
  }
};

// Fix the function that responds to notifications
export const onNotificationResponseReceived = async (response: Notifications.NotificationResponse) => {
  try {
    console.log('Notification response received!', response);
    
    // Check if alarm is already active before trying to handle it
    const alarmActive = await AsyncStorage.getItem('alarmScreenShowing');
    if (alarmActive === 'true') {
      console.log('Alarm screen already showing, cancelling notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    
    // Get the notification data
    const data = response.notification.request.content.data;
    console.log('Handling notification with data:', data);
    
    // Set flag that alarm screen is showing
    await AsyncStorage.setItem('alarmScreenShowing', 'true');
    
    // Mark that we're handling a legitimate alarm
    console.log('Handling legitimate alarm notification');
    
    // Start alarm UI and sound
    router.replace({
      pathname: '/alarm-ring',
      params: {
        alarmId: data.alarmId,
        sound: data.sound,
        soundVolume: data.soundVolume,
        vibration: data.vibration === true ? 'true' : 'false',
        hasMission: data.hasMission === true ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
};

// Find the function that handles notification responses
export const handleNotificationResponse = async (response: any) => {
  try {
    // Log what we're handling
    console.log('Notification response received!', response);
    
    const data = response.notification.request.content.data;
    console.log('Handling notification with data:', data);
    
    // Let the alarm-ring screen handle sound playback
    router.push({
      pathname: '/alarm-ring',
      params: { 
        alarmId: data.alarmId,
        sound: data.sound,
        soundVolume: data.soundVolume,
        hasMission: data.hasMission || false
      }
    });
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
};

// Add this near the top of your notifications.ts file, before other notification functions
// This ensures iOS shows your notification titles correctly
if (Platform.OS === 'ios') {
  (async () => {
    try {
      await Notifications.setNotificationCategoryAsync('alarmV2', [
        {
          identifier: 'alarmV2',
          buttonTitle: 'Open',
          options: { opensAppToForeground: true },
        }
      ]);
      console.log('Successfully registered notification category');
    } catch (error) {
      console.error('Failed to register notification category:', error);
    }
  })();
}

export default {};