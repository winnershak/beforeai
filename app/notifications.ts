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

// First, add a sound cache to prevent repeated loading/unloading
const soundCache = new Map();

// Improved sound loading function
export const loadSound = async (soundName: string) => {
  try {
    // Check if sound is already in cache
    if (soundCache.has(soundName)) {
      return soundCache.get(soundName);
    }
    
    // Load the sound
    console.log(`Loading sound: ${soundName}`);
    const { sound } = await Audio.Sound.createAsync(
      soundName in soundAssets 
        ? soundAssets[soundName as keyof typeof soundAssets] 
        : require('../assets/sounds/default.mp3')
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

// Update the playAlarmSound function to properly handle custom sounds
export const playAlarmSound = async (soundName: string, volume = 1.0) => {
  try {
    console.log(`Starting to play alarm sound: ${soundName} at volume ${volume}`);
    
    // Only stop current sound if we're changing volume significantly
    // This prevents interruptions during gentle wake-up
    if (global.currentAlarmSound) {
      const status = await global.currentAlarmSound.getStatusAsync();
      if (status.isLoaded) {
        // If volume change is small, just adjust volume instead of recreating
        if (Math.abs((status.volume || 0) - volume) < 0.2) {
          await global.currentAlarmSound.setVolumeAsync(volume);
          console.log(`Adjusted volume of existing sound to ${volume}`);
          return global.currentAlarmSound;
        } else {
          // Otherwise stop and recreate with new volume
          await stopAlarmSound();
        }
      }
    }
    
    // Configure audio mode first to ensure sound plays properly
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    
    // Create the sound directly without caching for alarm sounds
    // This ensures we always get a fresh sound instance
    const soundSource = soundName in soundAssets 
      ? soundAssets[soundName as keyof typeof soundAssets] 
      : require('../assets/sounds/default.mp3');
      
    console.log('Loading sound from source:', soundSource);
    
    const { sound } = await Audio.Sound.createAsync(
      soundSource,
      { 
        shouldPlay: true,
        volume: Math.max(0, Math.min(1, volume)),
        isLooping: true
      }
    );
    
    // Store reference to current alarm sound
    global.currentAlarmSound = sound;
    console.log('Alarm sound started playing at volume:', volume);
    
    // Add a listener to restart the sound if it stops for any reason
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && !status.isPlaying && isAlarmActive) {
        console.log('Sound stopped playing but alarm is still active, restarting...');
        sound.playAsync().catch(err => console.error('Error restarting sound:', err));
      }
    });
    
    return sound;
  } catch (error) {
    console.error('Error playing alarm sound:', error);
    return null;
  }
};

// Improve the stopAlarmSound function to be more reliable
export const stopAlarmSound = async () => {
  console.log('Stopping alarm sound');
  
  if (global.currentAlarmSound) {
    try {
      const status = await global.currentAlarmSound.getStatusAsync();
      
      if (status.isLoaded) {
        if (status.isPlaying) {
          await global.currentAlarmSound.stopAsync();
          console.log('Stopped playing sound');
        }
        await global.currentAlarmSound.unloadAsync();
        console.log('Unloaded sound');
      }
    } catch (error: unknown) {
      console.error('Error stopping sound:', error);
    } finally {
      global.currentAlarmSound = null;
    }
  }
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

// Request permissions at app startup
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // Only ask if permissions have not been determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Save the permission status
    if (finalStatus === 'granted') {
      await AsyncStorage.setItem('notificationPermissionGranted', 'true');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
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
            days: [],
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

// Update the scheduleAlarmNotification function to schedule multiple notifications
export async function scheduleAlarmNotification(alarm: Alarm) {
  try {
    // Request permissions first
    await requestNotificationPermissions();
    
    // Parse the time
    const [hours, minutes] = alarm.time.split(':');
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If the time has already passed today, set it for tomorrow
    const now = new Date();
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    console.log(`Scheduling notification for: ${alarmTime.toLocaleString()}`);
    
    // Cancel any existing notifications for this alarm
    if (alarm.id) {
      await cancelAlarmNotification(alarm.id);
    }
    
    // Schedule the main notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Wake Up!',
        body: 'Time to wake up!',
        sound: `${alarm.sound.toLowerCase()}.caf`,
        data: {
          alarmId: alarm.id,
          sound: alarm.sound,
          soundVolume: alarm.soundVolume,
          mission: alarm.mission,
          hasMission: Boolean(alarm.mission),
          fromNotification: 'true'
        },
      },
      trigger: {
        date: alarmTime,
        type: 'date'
      } as Notifications.DateTriggerInput,
    });
    
    console.log(`Scheduled notification with ID: ${notificationId} for ${alarmTime.toLocaleString()}`);
    
    // Schedule 5 backup notifications at 6-second intervals
    for (let i = 1; i <= 5; i++) {
      const backupTime = new Date(alarmTime);
      backupTime.setSeconds(backupTime.getSeconds() + (i * 6));
      
      const backupId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Wake Up!',
          body: `Your alarm is still ringing (${i})`,
          sound: `${alarm.sound.toLowerCase()}.caf`,
          data: {
            alarmId: alarm.id,
            sound: alarm.sound,
            soundVolume: alarm.soundVolume,
            mission: alarm.mission,
            hasMission: Boolean(alarm.mission),
            fromNotification: 'true'
          },
        },
        trigger: {
          date: backupTime,
          type: 'date'
        } as Notifications.DateTriggerInput,
      });
      
      console.log(`Scheduled backup notification ${i} with ID: ${backupId} for ${backupTime.toLocaleString()}`);
    }
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Update the handleNotification function to remove navigation to alarm-ring
export function handleNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  console.log('Handling notification with data:', data);

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
  
  // Start playing the sound immediately
  playAlarmSound(data.sound || 'Beacon', data.soundVolume || 1);
  
  // Store the alarm data in AsyncStorage for recovery
  AsyncStorage.setItem('currentAlarmData', JSON.stringify({
    alarmId: data.alarmId,
    sound: data.sound,
    soundVolume: data.soundVolume,
    hasMission: data.hasMission,
    mission: data.mission,
    timestamp: Date.now()
  })).catch(err => console.error('Error storing alarm data:', err));
  
  // DO NOT navigate to alarm-ring - let the app's layout handle this
  console.log('Alarm is active but not navigating from notification handler');
}

// Update the cancelAlarmNotification function to be simpler
export const cancelAlarmNotification = async (notificationId: string) => {
  try {
    console.log(`Cancelling notification with ID: ${notificationId}`);
    
    // Cancel all scheduled notifications to be safe
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
    
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// Add this function to set up notification handlers
export const setupNotificationHandlers = async () => {
  // Set up notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
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

// Update initializeAlarmSystem to include the notification handlers setup
export const initializeAlarmSystem = async () => {
  // Request permissions
  await requestNotificationPermissions();
  
  // Set up notification handlers
  await setupNotificationHandlers();
  
  // Configure audio
  await configureAudioMode();
  
  // Set up app state listener
  setupAppStateListener();
  
  // Register background task
  await registerBackgroundAlarmTask();
  
  console.log('Alarm system initialized');
};

// Add this to your app.tsx or index.js to initialize the alarm system
export const setupAlarms = () => {
  initializeAlarmSystem().catch(error => {
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

export default {};