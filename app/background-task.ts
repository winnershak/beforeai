import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Define your task identifiers - these must match what's in app.json
const ALARM_CHECK_TASK = 'com.yourusername.blissalarm.alarmcheck';
const REFRESH_TASK = 'com.yourusername.blissalarm.refresh';
const TETRIS_TASK = 'com.yourusername.blissalarm.tetris';

// Register the background tasks
TaskManager.defineTask(ALARM_CHECK_TASK, async () => {
  try {
    // Your alarm checking logic here
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background alarm check:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

TaskManager.defineTask(REFRESH_TASK, async () => {
  try {
    // Your refresh logic here
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background refresh:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

TaskManager.defineTask(TETRIS_TASK, async () => {
  try {
    // Your Tetris-related background processing here
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in Tetris background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Function to register all background tasks
export async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(ALARM_CHECK_TASK, {
      minimumInterval: 900, // 15 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(REFRESH_TASK, {
      minimumInterval: 3600, // 1 hour in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(TETRIS_TASK, {
      minimumInterval: 1800, // 30 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('Background tasks registered successfully');
  } catch (err) {
    console.error('Background task registration failed:', err);
  }
}

export default {}; 