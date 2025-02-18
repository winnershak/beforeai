import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Define available sounds with their require statements
const SOUND_FILES = {
  'Orkney': require('../assets/sounds/orkney.mp3'),
  'Radar': require('../assets/sounds/radar.mp3'),
  'Beacon': require('../assets/sounds/beacon.mp3'),
  'Chimes': require('../assets/sounds/chimes.mp3'),
  'Circuit': require('../assets/sounds/circuit.mp3'),
  'Reflection': require('../assets/sounds/reflection.mp3')
};

let alarmSound: Audio.Sound | null = null;

// At the top of the file, add audio mode configuration
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
});

// Register background task
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async ({ data, error }: any) => {
  if (error) return;
});

// Register background fetch
async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
      minimumInterval: 1, // 1 second
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.log("Task Register failed:", err);
  }
}

// Initialize background tasks
void registerBackgroundFetch();

// Configure notifications to play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,  // Enable sound
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Handle foreground notifications - play sound immediately
Notifications.addNotificationReceivedListener(async (notification) => {
  const data = notification.request.content.data as { sound: string; label?: string };
  await playAlarmSound(data.sound);
  
  router.push({
    pathname: '/alarm-ring',
    params: {
      sound: data.sound,
      label: data.label,
    },
  });
});

// Handle background notifications - play sound when opened
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const data = response.notification.request.content.data as { sound: string; label?: string };
  await playAlarmSound(data.sound);
  
  router.push({
    pathname: '/alarm-ring',
    params: {
      sound: data.sound,
      label: data.label,
    },
  });
});

// Update the permission request to be more explicit
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      }
    });
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Define available sounds
const ALARM_SOUNDS = {
  'Orkney': 'orkney.mp3',
  'Radar': 'radar.mp3',
  'Beacon': 'beacon.mp3',
  'Chimes': 'chimes.mp3',
  'Circuit': 'circuit.mp3',
  'Reflection': 'reflection.mp3'
};

export async function scheduleAlarmNotification(alarm: {
  id: string;
  time: string;
  days: string[];
  label?: string;
  sound: string;
}) {
  console.log('Selected sound:', alarm.sound); // Debug log

  // Get the correct sound filename
  const soundFile = ALARM_SOUNDS[alarm.sound as keyof typeof ALARM_SOUNDS];
  console.log('Sound file to be used:', soundFile); // Debug log

  const notificationContent: Notifications.NotificationContentInput = {
    title: alarm.label || 'Alarm',
    body: `It's ${alarm.time}!`,
    data: { 
      alarmId: alarm.id,
      sound: alarm.sound,  // This will be used to play the sound
      label: alarm.label,
    },
    sound: true,  // Enable sound for iOS notifications
    priority: Notifications.AndroidNotificationPriority.MAX,
  };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(`alarms-${alarm.id}`, {
      name: `Alarm-${alarm.id}`,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: soundFile,
      enableVibrate: true,
    });
  }

  await cancelAlarmNotification(alarm.id);
  const [hours, minutes] = alarm.time.split(':').map(Number);

  if (alarm.days.length === 0) {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'date',
        date: scheduledTime,
      } as Notifications.DateTriggerInput,
    });
  } else {
    for (const day of alarm.days) {
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: 'daily',
          hour: hours,
          minute: minutes,
          repeats: true,
        } as Notifications.DailyTriggerInput,
      });
    }
  }
}

export async function cancelAlarmNotification(alarmId: string) {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const alarmNotifications = scheduledNotifications.filter(
    notification => notification.content.data?.alarmId === alarmId
  );
  
  for (const notification of alarmNotifications) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
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

// Add function to stop sound
export async function stopAlarmSound() {
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

// Update playAlarmSound to handle background audio
export async function playAlarmSound(soundName: string) {
  try {
    await stopAlarmSound();
    
    // Configure audio for background playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const soundFile = SOUND_FILES[soundName as keyof typeof SOUND_FILES];
    if (!soundFile) {
      console.error('Sound not found:', soundName);
      return;
    }

    const { sound: audioSound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
        progressUpdateIntervalMillis: 1000,
        positionMillis: 0,
      },
      null,
      true  // shouldCorrectPitch for background playback
    );
    
    alarmSound = audioSound;
    await audioSound.playAsync();
  } catch (error) {
    console.error('Error playing alarm sound:', error);
  }
} 