import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SOUND_FILES = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf')
} as const;

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

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // Disable system sound
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
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
  soundName: keyof typeof SOUND_FILES,
  volume: number = 1
): Promise<void> {
  if (alarmSound !== null) return;
  
  try {
    await stopAlarmSound();
    await configureAudioMode();
    
    const soundFile = SOUND_FILES[soundName];
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

// Modify the notification response listener
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const alarmData = response.notification.request.content.data.alarm;
  
  await AsyncStorage.setItem('activeAlarm', JSON.stringify(alarmData));
  
  // Start playing sound before navigation
  await playAlarmSound(alarmData.sound, alarmData.soundVolume);
  
  if (alarmData.mission) {
    router.push({
      pathname: '/alarm-ring', // Changed to use alarm-ring for all cases
      params: {
        id: alarmData.id,
        sound: alarmData.sound,
        soundVolume: alarmData.soundVolume,
        hasMission: 'true',
        mission: alarmData.mission
      }
    });
  } else {
    router.push({
      pathname: '/alarm-ring',
      params: {
        id: alarmData.id,
        sound: alarmData.sound,
        soundVolume: alarmData.soundVolume,
        hasMission: 'false'
      }
    });
  }
});

// Schedule notification
export async function scheduleAlarmNotification(alarm: Alarm) {
  try {
    const [hours, minutes] = alarm.time.split(':');
    
    await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,
      content: {
        title: alarm.label || 'Alarm',
        body: 'Time to wake up!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { alarm },
      },
      trigger: {
        type: 'daily',  // Use daily trigger type
        hour: parseInt(hours),
        minute: parseInt(minutes),
        repeats: true,
      } as Notifications.DailyTriggerInput
    });
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
