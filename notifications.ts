// import * as Notifications from 'expo-notifications';

// export async function requestNotificationPermissions() {
//   const { status } = await Notifications.requestPermissionsAsync();
//   return status === 'granted';
// }

// export async function scheduleAlarmNotification(alarm: any) {
//   return await Notifications.scheduleNotificationAsync({
//     content: {
//       title: alarm.label || 'Alarm',
//       body: 'Time to wake up!',
//       sound: alarm.sound,
//     },
//     trigger: {
//       type: 'daily',
//       hour: parseInt(alarm.time.split(':')[0]),
//       minute: parseInt(alarm.time.split(':')[1]),
//       repeats: true
//     } as Notifications.DailyTriggerInput,
//   });
// }

// export async function cancelAlarmNotification(id: string) {
//   await Notifications.cancelScheduledNotificationAsync(id);
// } 