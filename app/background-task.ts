import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_ALARM_CHECK = 'background-alarm-check';

TaskManager.defineTask(BACKGROUND_ALARM_CHECK, async () => {
  try {
    // Just keep the task alive but don't check time
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_CHECK, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Registered background task');
  } catch (err) {
    console.error('Task registration failed:', err);
  }
} 