import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export default class NotificationService {
  // Schedule a bedtime notification
  static async scheduleBedtimeNotification(hour, minute, weekday, body = 'Time to disconnect and prepare for sleep!') {
    try {
      // Ensure we have permission
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }
      
      // Schedule the notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bedtime Reminder',
          body: body,
          sound: 'default',
          priority: 'high',
        },
        trigger: {
          hour: hour,
          minute: minute,
          weekday: weekday,
          repeats: true,
        },
      });
      
      console.log(`Scheduled notification for ${weekday} at ${hour}:${minute}, ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error scheduling bedtime notification:', error);
      return false;
    }
  }
  
  // Schedule a test notification
  static async scheduleTestNotification() {
    try {
      // Ensure we have permission
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }
      
      // Schedule an immediate notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification!',
          sound: 'default',
        },
        trigger: null, // null means send immediately
      });
      
      console.log(`Scheduled test notification, ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      return false;
    }
  }
  
  // Cancel all scheduled notifications
  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
      return true;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      return false;
    }
  }
  
  // Get all scheduled notifications
  static async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Found ${notifications.length} scheduled notifications`);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
} 