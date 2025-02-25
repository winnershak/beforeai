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

// Define sound assets statically
const soundAssets = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

// Configure audio mode
const configureAudioMode = async () => {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
    interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
};
configureAudioMode().catch(console.error);

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

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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

export async function playAlarmSound(
  soundName: keyof typeof soundAssets,
  volume: number = 1
): Promise<void> {
  if (alarmSound !== null) return;
  
  try {
    await stopAlarmSound();
    await configureAudioMode();
    
    const soundFile = soundAssets[soundName];
    const { sound: audioSound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: true,
        isLooping: true,
        volume: Math.max(0, Math.min(1, volume)),
      }
    );
    
    alarmSound = audioSound;
    await audioSound.playAsync();
    
    audioSound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && !status.isPlaying && status.shouldPlay) {
        await audioSound.playAsync();
      }
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get permission for notifications!');
    return false;
  }
  
  return true;
};

// Schedule an alarm notification
export const scheduleAlarmNotification = async (alarm: any) => {
  try {
    console.log('Scheduling alarm notification:', alarm);
    
    // Cancel any existing notification for this alarm
    if (alarm.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
    }

    // Get sound name from alarm settings
    const soundName = alarm.sound || 'default';
    console.log('Using sound for notification:', soundName);
    
    // Parse hour and minute from time string
    let hour = 0;
    let minute = 0;
    
    if (alarm.time && typeof alarm.time === 'string') {
      const timeParts = alarm.time.split(':');
      if (timeParts.length === 2) {
        hour = parseInt(timeParts[0], 10);
        minute = parseInt(timeParts[1], 10);
      }
    } else if (alarm.hour !== undefined && alarm.minute !== undefined) {
      hour = parseInt(alarm.hour, 10);
      minute = parseInt(alarm.minute, 10);
    }
    
    // Validate hour and minute
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      console.error('Invalid time values:', { hour, minute, originalTime: alarm.time });
      return null;
    }
    
    // Calculate trigger time
    const now = new Date();
    let triggerDate = new Date();
    triggerDate.setHours(hour);
    triggerDate.setMinutes(minute);
    triggerDate.setSeconds(0);
    
    // If alarm time is in the past, schedule for tomorrow
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    
    // Calculate seconds until alarm
    const secondsUntilAlarm = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
    console.log(`Alarm will trigger in ${secondsUntilAlarm} seconds (${triggerDate.toLocaleString()})`);
    
    // Format the sound name for iOS (lowercase with .caf extension)
    const formattedSoundName = `${soundName.toLowerCase()}.caf`;
    console.log('Formatted sound name:', formattedSoundName);
    
    // Schedule using timeInterval trigger for more reliable alarms
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Wake Up!',
        body: alarm.label ? 'Time to wake up!' : 'Your alarm is ringing',
        data: { 
          alarmId: alarm.id,
          hasMission: alarm.mission ? true : false,
          sound: soundName,
          soundVolume: alarm.soundVolume || 1,
          mission: alarm.mission
        },
        sound: formattedSoundName, // Use the formatted sound name
      },
      trigger: {
        type: 'timeInterval',
        seconds: secondsUntilAlarm,
        repeats: false
      } as Notifications.TimeIntervalTriggerInput
    });
    
    console.log('Notification scheduled with ID:', notificationId);
    
    // Save notification ID with alarm
    const updatedAlarm = { ...alarm, notificationId };
    
    // Update alarms in storage
    const alarmsJson = await AsyncStorage.getItem('alarms');
    const alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
    const updatedAlarms = alarms.map((a: any) => 
      a.id === alarm.id ? updatedAlarm : a
    );
    
    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Handle alarm notification when received
export const handleAlarmNotification = async (notification: Notifications.Notification) => {
  try {
    const data = notification.request.content.data;
    const alarmId = data.alarmId;
    const hasMission = data.hasMission;
    const sound = data.sound;
    const soundVolume = data.soundVolume;
    
    // Schedule continuous notifications
    scheduleContinuousNotifications(
      alarmId as string, 
      hasMission as string, 
      sound as string, 
      soundVolume as string
    );
    
    return {
      alarmId,
      hasMission,
      sound,
      soundVolume
    };
  } catch (error) {
    console.error('Error handling notification:', error);
    return null;
  }
};

// Set up notification listeners
export function setupNotificationListeners() {
  // Handle notification received
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    
    // Get the data from the notification
    const data = notification.request.content.data;
    console.log('Notification data:', data);
    
    // Play the sound manually if needed
    if (data.sound && typeof data.sound === 'string' && data.sound in soundAssets) {
      const soundName = data.sound as keyof typeof soundAssets;
      const volume = typeof data.soundVolume === 'number' ? data.soundVolume : 1;
      
      console.log('Playing sound manually:', soundName, 'at volume', volume);
      playAlarmSound(soundName, volume);
    }
  });
  
  // Handle notification response (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response received:', response);
    
    // Get the data from the notification
    const data = response.notification.request.content.data;
    
    // Add a small delay to ensure layout is mounted
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
  });
  
  return {
    remove: () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    }
  };
}

// Schedule continuous notifications with the same sound
export const scheduleContinuousNotifications = async (
  alarmId: string, 
  hasMission: string, 
  sound: string, 
  soundVolume: string
) => {
  try {
    // Schedule a single notification with a short delay
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Wake Up!',
        body: 'Your alarm is still ringing. Tap to open.',
        data: { 
          alarmId,
          hasMission,
          sound,
          soundVolume,
          continuous: true
        },
        sound: sound, // Use the same custom sound
      },
      trigger: {
        type: 'timeInterval',
        seconds: 1, // Short delay
        repeats: false
      } as Notifications.TimeIntervalTriggerInput
    });
  } catch (error) {
    console.error('Error scheduling continuous notification:', error);
  }
};

// Update existing handleNotification
export function handleNotification(notification: Notifications.Notification) {
  // Log but don't do anything with the notification
  console.log('Notification received:', notification.request.identifier);
  
  // Remove all alarm checking and navigation
  return;
}

// Add function to reset alarm state
export function resetAlarmState() {
  isAlarmActive = false;
}

// Add function to check current alarms
export async function checkCurrentAlarms() {
  try {
    // Check if app is ready for navigation
    const isAppReady = await AsyncStorage.getItem('isAppReady');
    if (isAppReady !== 'true') {
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

// Check less frequently to avoid excessive updates
const checkInterval = 10000; // Check every 10 seconds instead of every second
setInterval(checkCurrentAlarms, checkInterval);

// Cancel an alarm notification
export const cancelAlarmNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Add this to your app's entry point (App.tsx or similar)
export const initializeNotifications = async () => {
  await requestNotificationPermissions();
  setupNotificationListeners();
};