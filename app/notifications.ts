import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Register background task
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async ({ data, error }: any) => {
  if (error) return;
  
  // Configure audio for background playback
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
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

// Configure notifications to be silent
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Set up Android channel without sound
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('alarms', {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: null,
    enableVibrate: true,
  });
}

// Configure audio session
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});

// Handle foreground notifications
Notifications.addNotificationReceivedListener(async (notification) => {
  const data = notification.request.content.data as { sound: string; label?: string };
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    router.push({
      pathname: '/alarm-ring',
      params: {
        sound: data.sound,
        label: data.label,
      },
    });
  } catch (error) {
    console.error('Error handling notification:', error);
  }
});

// Handle background notifications
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data as { sound: string; label?: string };
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
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: null,
      enableVibrate: true,
    });
  }

  return finalStatus === 'granted';
}

export async function scheduleAlarmNotification(alarm: {
  id: string;
  time: string;
  days: string[];
  label?: string;
  sound: string;
}) {
  await cancelAlarmNotification(alarm.id);
  const [hours, minutes] = alarm.time.split(':').map(Number);

  const notificationContent: Notifications.NotificationContentInput = {
    title: alarm.label || 'Alarm',
    body: `It's ${alarm.time}!`,
    data: { 
      alarmId: alarm.id,
      sound: alarm.sound,
      label: alarm.label,
    },
    sound: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };

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
  };
} 