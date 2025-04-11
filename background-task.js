// import * as BackgroundFetch from 'expo-background-fetch';
// import * as TaskManager from 'expo-task-manager';

// const ALARM_TASK = 'ALARM_TASK';

// // Define the task first
// TaskManager.defineTask(ALARM_TASK, async () => {
//   try {
//     // Your background task logic here
//     console.log('Background task executed');
//     return BackgroundFetch.BackgroundFetchResult.NewData;
//   } catch (error) {
//     console.error('Error in background task:', error);
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// export const registerBackgroundTask = async () => {
//   // TEMPORARILY DISABLED FOR STABILITY
//   console.log('Background tasks temporarily disabled for stability');
//   return;
  
//   // Original implementation below - commented out
//   /*
//   try {
//     // Check if the task is already registered
//     const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_TASK);
//     if (isRegistered) {
//       console.log('Background task already registered');
//       return;
//     }
    
//     // Register the task with a delay
//     setTimeout(async () => {
//       try {
//         await BackgroundFetch.registerTaskAsync(ALARM_TASK, {
//           minimumInterval: 60, // 1 minute minimum
//           stopOnTerminate: false,
//           startOnBoot: true,
//         });
//         console.log('Background task registered successfully');
//       } catch (registerError) {
//         console.error('Error registering background task:', registerError);
//       }
//     }, 10000); // 10 second delay
//   } catch (error) {
//     console.error('Error in registerBackgroundTask:', error);
//   }
//   */
// };

// // Add error handling to any network requests
// const safelyFetchData = async (url) => {
//   try {
//     // Add timeout to prevent hanging
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 5000);
    
//     const response = await fetch(url, { signal: controller.signal });
//     clearTimeout(timeoutId);
    
//     return await response.json();
//   } catch (error) {
//     console.warn('Network request failed:', error);
//     return null; // Return default value
//   }
// }; 