import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Define our own interruption mode constants
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
}

// Sound management
let alarmSound: Awaited<ReturnType<typeof Audio.Sound.createAsync>>['sound'] | null = null;

const SOUND_FILES = {
  'Orkney': require('../assets/sounds/orkney.mp3'),
  'Radar': require('../assets/sounds/radar.mp3'),
  'Beacon': require('../assets/sounds/beacon.mp3'),
  'Chimes': require('../assets/sounds/chimes.mp3'),
  'Circuit': require('../assets/sounds/circuit.mp3'),
  'Reflection': require('../assets/sounds/reflection.mp3')
} as const;

const DEFAULT_NOTIFICATION_VOLUME = 0.5; // 50%

// Configure audio mode for iOS
const configureAudioMode = async () => {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
    interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    allowsRecordingIOS: false,
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

// Configure notification handler (disable default system sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // Disable system default sound
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Sound control functions
export async function stopAlarmSound(): Promise<void> {
  try {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
      console.log('Alarm sound stopped.');
    }
  } catch (error) {
    console.error('Error stopping sound:', error);
  }
}

export async function playAlarmSound(
  soundName: keyof typeof SOUND_FILES,
  volume: number = 1
): Promise<void> {
  // Guard: if a sound is already playing, do nothing.
  if (alarmSound !== null) {
    console.log('playAlarmSound: Sound already playing.');
    return;
  }
  console.log('playAlarmSound: Starting playback for', soundName);
  try {
    await stopAlarmSound();
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
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
    console.log('playAlarmSound: Playback started for', soundName);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Remove all existing notification listeners to avoid duplicates.
//Notifications.removeAllNotificationListeners();

// Register a single notification response listener.
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const data = response.notification.request.content.data as { 
    sound: string; 
    label?: string;
    soundVolume?: number;
  };
  console.log('Notification response received:', data);
  // Call playAlarmSound once.
  await playAlarmSound(data.sound as keyof typeof SOUND_FILES, data.soundVolume ?? 1);
  
  // Navigate to the alarm screen.
  router.push({
    pathname: '/alarm-ring',
    params: {
      sound: data.sound,
      label: data.label,
      soundVolume: data.soundVolume,
    },
  });
});

// Permission management
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });
    return status === 'granted';
  }
  return true;
}

// Alarm scheduling
export async function scheduleAlarmNotification(alarm: Alarm): Promise<string> {
  const [hours, minutes] = alarm.time.split(':').map(Number);
  const notificationContent: Notifications.NotificationContentInput = {
    title: alarm.label || 'Alarm',
    body: `It's ${alarm.time}!`,
    data: {
      sound: alarm.sound,
      label: alarm.label,
      soundVolume: alarm.soundVolume,
    },
    // No default "sound" property included.
  };

  if (alarm.days.length === 0) {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    return await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'date',
        date: scheduledTime,
      } as Notifications.DateTriggerInput,
    });
  }
  return await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: {
      type: 'daily',
      hour: hours,
      minute: minutes,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}

// Cancel a scheduled notification.
export async function cancelAlarmNotification(id: string): Promise<void> {
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
