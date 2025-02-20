import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAlarmManager() {
  const router = useRouter();

  useEffect(() => {
    checkActiveAlarm();
  }, []);

  const checkActiveAlarm = async () => {
    try {
      const activeAlarm = await AsyncStorage.getItem('activeAlarm');
      if (activeAlarm) {
        const alarm = JSON.parse(activeAlarm);
        if (alarm.mission) {
          router.push({
            pathname: '/mission/alarm-trigger',
            params: {
              difficulty: alarm.mission.difficulty,
              times: alarm.mission.times,
              sound: alarm.sound,
              soundVolume: alarm.soundVolume
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking active alarm:', error);
    }
  };

  const triggerAlarm = async (alarm: any) => {
    try {
      await AsyncStorage.setItem('activeAlarm', JSON.stringify(alarm));
      
      if (alarm.mission) {
        router.push({
          pathname: '/mission/alarm-trigger',
          params: {
            difficulty: alarm.mission.difficulty,
            times: alarm.mission.times,
            sound: alarm.sound,
            soundVolume: alarm.soundVolume
          }
        });
      } else {
        router.push({
          pathname: '/alarm-ring',
          params: {
            sound: alarm.sound,
            soundVolume: alarm.soundVolume
          }
        });
      }
    } catch (error) {
      console.error('Error triggering alarm:', error);
    }
  };

  const dismissAlarm = async () => {
    try {
      await AsyncStorage.removeItem('activeAlarm');
    } catch (error) {
      console.error('Error dismissing alarm:', error);
    }
  };

  return {
    triggerAlarm,
    dismissAlarm,
    checkActiveAlarm
  };
} 