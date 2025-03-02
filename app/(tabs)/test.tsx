import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleAlarmNotification, initializeNotifications, testNotificationIn5Seconds as scheduleTestNotification } from '../notifications';
import * as Notifications from 'expo-notifications';

export default function TestScreen() {
  const [hasAlarm, setHasAlarm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if there are any alarms on mount
  useEffect(() => {
    checkAlarms();
    // Initialize notifications
    initializeNotifications();
  }, []);
  
  const checkAlarms = async () => {
    try {
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        const alarms = JSON.parse(alarmsJson);
        setHasAlarm(alarms.length > 0);
      }
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  };
  
  const handleEditAlarm = () => {
    router.push('/new-alarm');
  };
  
  const handlePlayAlarm = async () => {
    try {
      // Get the first alarm from storage
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        const alarms = JSON.parse(alarmsJson);
        if (alarms.length > 0) {
          const alarm = alarms[0]; // Use the first alarm
          
          // Navigate to alarm ring screen with this alarm's settings
          router.push({
            pathname: '/alarm-ring',
            params: {
              alarmId: alarm.id,
              hasMission: alarm.mission ? 'true' : 'false',
              sound: alarm.sound || 'Beacon',
              soundVolume: alarm.soundVolume?.toString() || '1'
            }
          });
        } else {
          alert('No alarms found. Please create an alarm first.');
        }
      } else {
        alert('No alarms found. Please create an alarm first.');
      }
    } catch (error) {
      console.error('Error playing alarm:', error);
      alert('Error playing alarm. Please try again.');
    }
  };
  
  // New function to test notification in 5 seconds
  const testNotificationIn5Seconds = async () => {
    try {
      setIsLoading(true);
      
      // Get the first alarm from storage
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        Alert.alert('No Alarms', 'Please create an alarm first');
        setIsLoading(false);
        return;
      }
      
      const alarms = JSON.parse(alarmsJson);
      if (alarms.length === 0) {
        Alert.alert('No Alarms', 'Please create an alarm first');
        setIsLoading(false);
        return;
      }
      
      const alarm = alarms[0]; // Use the first alarm
      
      // Use the imported function with the different name
      const notificationId = await scheduleTestNotification(alarm);
      
      if (notificationId) {
        Alert.alert('Test Scheduled', `Notification will appear in 5 seconds. ID: ${notificationId}`);
      } else {
        Alert.alert('Error', 'Failed to schedule test notification');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', `Failed to schedule test: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Alarm Test</Text>
        <Text style={styles.subtitle}>Quick testing tools</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.editButton]} 
            onPress={handleEditAlarm}
          >
            <Text style={styles.buttonText}>Edit Alarm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.playButton, !hasAlarm && styles.disabledButton]} 
            onPress={handlePlayAlarm}
            disabled={!hasAlarm}
          >
            <Text style={styles.buttonText}>
              {hasAlarm ? 'Play Alarm Now' : 'Create an alarm first'}
            </Text>
          </TouchableOpacity>
          
          {/* New test notification button */}
          <TouchableOpacity 
            style={[styles.button, styles.testButton, !hasAlarm && styles.disabledButton]} 
            onPress={testNotificationIn5Seconds}
            disabled={!hasAlarm || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Scheduling...' : 'Test Notification (5s)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 