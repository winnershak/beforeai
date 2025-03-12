import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SnoozeConfirmationScreen() {
  const params = useLocalSearchParams();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [hasMission, setHasMission] = useState(false);
  const [alarmId, setAlarmId] = useState('');
  const [sound, setSound] = useState('');
  const [soundVolume, setSoundVolume] = useState(1);

  useEffect(() => {
    // Load snoozed alarm data from AsyncStorage
    const loadSnoozeData = async () => {
      try {
        const snoozeDataJson = await AsyncStorage.getItem('snoozedAlarm');
        if (snoozeDataJson) {
          const snoozeData = JSON.parse(snoozeDataJson);
          console.log('Loaded snooze data:', snoozeData);
          
          setHasMission(snoozeData.hasMission);
          setAlarmId(snoozeData.alarmId);
          setSound(snoozeData.sound || '');
          setSoundVolume(snoozeData.soundVolume || 1);
        } else {
          console.log('No snoozed alarm data found');
          // Also check params
          setHasMission(params.hasMission === 'true');
        }
      } catch (error) {
        console.error('Error loading snoozed alarm data:', error);
      }
    };
    
    loadSnoozeData();
  }, [params.hasMission]);

  useEffect(() => {
    // Calculate and display time remaining until snooze alarm
    const updateTimeRemaining = () => {
      try {
        if (params.snoozeTime) {
          const snoozeTime = new Date(params.snoozeTime as string);
          const now = new Date();
          
          // Calculate time difference in milliseconds
          const diff = snoozeTime.getTime() - now.getTime();
          
          if (diff <= 0) {
            // Time's up, navigate back to alarm-ring instead of home
            console.log('Snooze time expired, returning to alarm-ring');
            
            // Get the alarm data from storage
            AsyncStorage.getItem('snoozedAlarm').then(snoozeDataJson => {
              if (snoozeDataJson) {
                const snoozeData = JSON.parse(snoozeDataJson);
                
                // Navigate back to alarm-ring with the alarm data
                router.replace({
                  pathname: '/alarm-ring',
                  params: {
                    alarmId: snoozeData.alarmId,
                    sound: snoozeData.sound,
                    soundVolume: snoozeData.soundVolume,
                    hasMission: snoozeData.hasMission,
                    fromSnooze: 'true'
                  }
                });
              } else {
                // Fallback if no data is found
                router.replace('/alarm-ring');
              }
            }).catch(error => {
              console.error('Error getting snoozed alarm data:', error);
              router.replace('/alarm-ring');
            });
            
            return;
          }
          
          // Convert to minutes and seconds
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          // Format as MM:SS
          setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      } catch (error) {
        console.error('Error updating time remaining:', error);
      }
    };
    
    // Update immediately
    updateTimeRemaining();
    
    // Then update every second
    const interval = setInterval(updateTimeRemaining, 1000);
    
    // Clean up
    return () => clearInterval(interval);
  }, [params.snoozeTime]);

  const handleCancelSnooze = async () => {
    try {
      console.log('Canceling snooze');
      
      // Get the alarm ID from AsyncStorage if not already set
      let currentAlarmId = alarmId;
      if (!currentAlarmId) {
        const snoozeDataJson = await AsyncStorage.getItem('snoozedAlarm');
        if (snoozeDataJson) {
          const snoozeData = JSON.parse(snoozeDataJson);
          currentAlarmId = snoozeData.alarmId;
        }
      }
      
      if (!currentAlarmId) {
        console.error('No alarm ID found');
        router.replace('/');
        return;
      }
      
      // Get all alarms
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        console.error('No alarms found in storage');
        router.replace('/');
        return;
      }
      
      const alarms = JSON.parse(alarmsJson);
      const alarm = alarms.find((a: any) => a.id === currentAlarmId);
      
      if (!alarm) {
        console.error('Alarm not found');
        router.replace('/');
        return;
      }
      
      // Cancel the notification
      if (alarm.notificationId) {
        // Import the cancelAlarmNotification function
        const { cancelAlarmNotification } = require('./notifications');
        await cancelAlarmNotification(alarm.notificationId);
      }
      
      // Clear the snoozed alarm data
      await AsyncStorage.removeItem('snoozedAlarm');
      
      // Navigate back to home
      router.replace('/');
    } catch (error) {
      console.error('Error canceling snooze:', error);
      router.replace('/');
    }
  };

  const handleStartMission = async () => {
    try {
      console.log('Starting mission from snooze confirmation');
      
      // Get the alarm ID from AsyncStorage if not already set
      let currentAlarmId = alarmId;
      if (!currentAlarmId) {
        const snoozeDataJson = await AsyncStorage.getItem('snoozedAlarm');
        if (snoozeDataJson) {
          const snoozeData = JSON.parse(snoozeDataJson);
          currentAlarmId = snoozeData.alarmId;
        }
      }
      
      if (!currentAlarmId) {
        console.error('No alarm ID found');
        router.replace('/');
        return;
      }
      
      // Get all alarms
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        console.error('No alarms found in storage');
        router.replace('/');
        return;
      }
      
      const alarms = JSON.parse(alarmsJson);
      const alarm = alarms.find((a: any) => a.id === currentAlarmId);
      
      if (!alarm) {
        console.error('Alarm not found');
        router.replace('/');
        return;
      }
      
      // Cancel the notification
      if (alarm.notificationId) {
        // Import the cancelAlarmNotification function
        const { cancelAlarmNotification } = require('./notifications');
        await cancelAlarmNotification(alarm.notificationId);
      }
      
      // Clear the snoozed alarm data
      await AsyncStorage.removeItem('snoozedAlarm');
      
      // Navigate to the appropriate mission screen based on mission type
      if (alarm.mission) {
        let missionType;
        
        if (typeof alarm.mission === 'string') {
          missionType = alarm.mission;
        } else if (alarm.mission.name) {
          missionType = alarm.mission.name;
        } else if (alarm.mission.type) {
          missionType = alarm.mission.type;
        } else if (alarm.mission.settings?.type) {
          missionType = alarm.mission.settings.type;
        }
        
        const missionTypeLower = missionType?.toLowerCase() || '';
        
        switch (missionTypeLower) {
          case 'math':
            const mathSettings = alarm.mission.settings || {};
            const difficulty = mathSettings.difficulty || 'medium';
            
            router.push({
              pathname: '/final-math',
              params: {
                alarmId: alarm.id,
                difficulty: difficulty,
                sound: sound,
                soundVolume: soundVolume
              }
            });
            break;
            
          case 'photo':
            const photoSettings = alarm.mission.settings || {};
            const photoUri = photoSettings.photo || alarm.photo || '';
            
            router.push({
              pathname: '/final-photo',
              params: {
                alarmId: alarm.id,
                targetPhoto: photoUri,
                sound: sound,
                soundVolume: soundVolume
              }
            });
            break;
            
          case 'qr':
          case 'qr/barcode':
            router.push({
              pathname: '/final-qr',
              params: {
                alarmId: alarm.id,
                sound: sound,
                soundVolume: soundVolume
              }
            });
            break;
            
          case 'typing':
            const typingSettings = alarm.mission.settings || {};
            
            router.push({
              pathname: '/final-typing',
              params: {
                alarmId: alarm.id,
                text: typingSettings.phrase || 'The quick brown fox jumps over the lazy dog',
                caseSensitive: typingSettings.caseSensitive || false,
                timeLimit: typingSettings.timeLimit || 30,
                sound: sound,
                soundVolume: soundVolume
              }
            });
            break;
            
          default:
            console.error('Unknown mission type:', missionType);
            router.replace('/');
            break;
        }
      } else {
        // No mission, just go back to home
        router.replace('/');
      }
    } catch (error) {
      console.error('Error starting mission:', error);
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Alarm Snoozed</Text>
        
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={40} color="#fff" />
          <Text style={styles.timer}>{timeRemaining}</Text>
        </View>
        
        <Text style={styles.subtitle}>
          Your alarm will ring again in {timeRemaining}
        </Text>
        
        <View style={styles.buttonContainer}>
          {hasMission ? (
            <TouchableOpacity 
              style={[styles.button, styles.missionButton]} 
              onPress={handleStartMission}
            >
              <Text style={styles.buttonText}>Start Mission Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]} 
              onPress={handleCancelSnooze}
            >
              <Text style={styles.buttonText}>Stop Alarm</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#fff',
    marginBottom: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  missionButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 