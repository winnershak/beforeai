import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

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
    const data = notification.request.content.data;
    
    // If app is in foreground, trigger alarm screen directly
    if (!isAlarmActive) {
      isAlarmActive = true;
      handleAlarmTrigger(data);
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      presentAlert: true,
      presentSound: true,
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

// Schedule notification with more logging
export async function scheduleAlarmNotification(alarm: Alarm) {
  try {
    const [hours, minutes] = alarm.time.split(':');
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    let timeUntilAlarm = (scheduledTime.getTime() - now.getTime()) / 1000;

    if (timeUntilAlarm <= 0) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      timeUntilAlarm = (scheduledTime.getTime() - now.getTime()) / 1000;
    }

    const soundPath = await getSoundPath(alarm.sound);
    console.log('Using sound path for notification:', soundPath);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Alarm',
        body: 'Time to wake up!',
        sound: `${alarm.sound.toLowerCase()}.caf`,
        data: {
          alarmId: alarm.id,
          sound: alarm.sound,
          soundVolume: alarm.soundVolume,
          mission: alarm.mission,
          hasMission: Boolean(alarm.mission)
        },
      },
      trigger: {
        type: 'timeInterval',
        seconds: Math.floor(timeUntilAlarm),
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput
    });

    console.log('Scheduled notification:', {
      time: scheduledTime.toLocaleTimeString(),
      sound: `${alarm.sound.toLowerCase()}.caf`,
      id: notificationId
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

// Cancel notification
export async function cancelAlarmNotification(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

function calculateNextAlarmDate(hours: number, minutes: number, day: string) {
  return {
    type: 'calendar',
    hour: hours,
    minute: minutes,
    repeats: true,
  } as Notifications.CalendarTriggerInput;
}

// New function to handle alarm triggering
export async function handleAlarmTrigger(alarmData: any) {
  console.log('Triggering alarm with data:', alarmData);
  
  // Route to appropriate screen based on mission presence
  if (alarmData.hasMission) {
    router.push({
      pathname: '/alarm-ring',
      params: {
        alarmId: alarmData.alarmId,
        sound: alarmData.sound,
        mission: alarmData.mission,
        soundVolume: alarmData.soundVolume,
        hasMission: 'true'
      }
    });
  } else {
    router.push({
      pathname: '/alarm-ring',
      params: {
        alarmId: alarmData.alarmId,
        sound: alarmData.sound,
        soundVolume: alarmData.soundVolume,
        hasMission: 'false'
      }
    });
  }
}

// Update existing handleNotification
export function handleNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  console.log('Handling notification with data:', data);

  if (!isAlarmActive) {
    isAlarmActive = true;
    handleAlarmTrigger(data);
  }
}

// Add function to reset alarm state
export function resetAlarmState() {
  isAlarmActive = false;
}

// Add function to check current alarms
export async function checkCurrentAlarms() {
  try {
    if (!router.canGoBack()) {
      return;
    }

    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (!alarmsJson) return;

    const alarms = JSON.parse(alarmsJson);
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentSeconds = now.getSeconds();

    // Find alarm that matches current time
    const currentAlarm = alarms.find((alarm: Alarm) => {
      return alarm.time === currentTime && currentSeconds < 3; // Only trigger in first 3 seconds of the minute
    });
    
    if (currentAlarm) {
      console.log('Found matching alarm:', currentAlarm);
      router.push({
        pathname: '/alarm-ring',
        params: {
          alarmId: currentAlarm.id,
          sound: currentAlarm.sound,
          soundVolume: currentAlarm.soundVolume,
          mission: currentAlarm.mission,
          hasMission: Boolean(currentAlarm.mission).toString()
        }
      });
    }
  } catch (error) {
    console.error('Error checking alarm time:', error);
  }
}

// Check more frequently
setInterval(checkCurrentAlarms, 1000); // Check every second instead of every minute