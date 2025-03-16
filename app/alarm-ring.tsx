import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Vibration } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { scheduleAlarmNotification, stopAlarmSound, cancelAllNotifications, resetAlarmState, playAlarmSound } from './notifications';
import * as Notifications from 'expo-notifications';
import soundAssets from './sounds';

// Add this type definition at the top of your file
interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
  days: string[];
  label?: string;
  sound?: string;
  soundVolume?: number;
  mission?: any;
  vibration?: boolean;
  notificationId?: string;
  photo?: string;
  snooze?: {
    enabled: boolean;
    duration?: number;
    limit?: number;
    interval?: number;
    maxSnoozes?: number;
  };
}

// Add these functions at the top of your file, after imports
const startVibration = () => {
  // Pattern: wait 500ms, vibrate 500ms, wait 500ms, vibrate 500ms, etc.
  const pattern = [500, 500];
  Vibration.vibrate(pattern, true);
  console.log('Vibration started');
};

const stopVibration = () => {
  Vibration.cancel();
  console.log('Vibration stopped');
};

// Add this function near the top of your file, before the component
const getSoundSource = (soundName: string | string[]) => {
  // If soundName is an array, use the first element
  const name = Array.isArray(soundName) ? soundName[0] : soundName;
  
  const soundMap: {[key: string]: any} = {
    'Beacon': require('../assets/sounds/beacon.caf'),
    'Chimes': require('../assets/sounds/chimes.caf'),
    'Circuit': require('../assets/sounds/circuit.caf'),
    'Radar': require('../assets/sounds/radar.caf'),
    'Reflection': require('../assets/sounds/reflection.caf'),
    'Orkney': require('../assets/sounds/orkney.caf'),
  };
  
  return soundMap[name] || soundMap['Beacon']; // Default to Beacon if sound not found
};

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasInitialized = useRef(false);
  const hasMissionStarted = useRef(false);
  const [missionFailed, setMissionFailed] = useState(false);
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [snoozeDuration, setSnoozeDuration] = useState(5); // Default 5 minutes
  const [snoozeLimit, setSnoozeLimit] = useState(3); // Default 3 snoozes
  const [snoozeRemaining, setSnoozeRemaining] = useState(3);
  const [currentAlarm, setCurrentAlarm] = useState<Alarm | null>(null);
  const [hasMission, setHasMission] = useState(false);
  const [missionType, setMissionType] = useState('');
  const loadAlarmRef = useRef<(() => Promise<void>) | null>(null);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);

  console.log('AlarmRingScreen params:', params);

  // Update the useEffect that runs when the component mounts
  useEffect(() => {
    // Only log once when component mounts
    console.log('AlarmRingScreen mounted with params:', params);
    
    // Start vibration
    if (params.vibration !== 'false') {
      startVibration();
    }
    
    // Load alarm data
    loadAlarmData();
    
    // Cancel ALL notifications when alarm screen is opened
    cancelAllNotifications();
    
    // Set the flag that alarm-ring screen is active
    AsyncStorage.setItem('alarmRingActive', 'true');
    
    return () => {
      // Clean up when component unmounts
      stopVibration();
      stopAlarmSound();
      AsyncStorage.removeItem('alarmRingActive');
    };
  }, []); // Empty dependency array to run only once

  // Replace the entire sound playback useEffect with this simpler version
  useEffect(() => {
    console.log('Setting up alarm sound playback');
    let soundObject: Audio.Sound | null = null;
    
    const setupAndPlaySound = async () => {
      try {
        // Configure audio mode first
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Get sound name from params
        const soundName = params.sound ? 
          (Array.isArray(params.sound) ? params.sound[0] : params.sound as string) : 
          'Beacon';
        
        console.log('Loading sound:', soundName);
        
        // Create sound object with direct require
        let soundSource;
        if (soundName === 'Beacon') {
          soundSource = require('../assets/sounds/beacon.caf');
        } else if (soundName === 'Chimes') {
          soundSource = require('../assets/sounds/chimes.caf');
        } else if (soundName === 'Circuit') {
          soundSource = require('../assets/sounds/circuit.caf');
        } else if (soundName === 'Radar') {
          soundSource = require('../assets/sounds/radar.caf');
        } else if (soundName === 'Reflection') {
          soundSource = require('../assets/sounds/reflection.caf');
        } else if (soundName === 'Orkney') {
          soundSource = require('../assets/sounds/orkney.caf');
        } else {
          // Default sound
          soundSource = require('../assets/sounds/beacon.caf');
        }
        
        console.log('Creating sound with source');
        
        // Create and play the sound
        const { sound } = await Audio.Sound.createAsync(
          soundSource,
          { 
            isLooping: true,
            volume: parseFloat(params.soundVolume as string || '1'),
            shouldPlay: true 
          }
        );
        
        soundObject = sound;
        setSound(sound);
        setIsPlaying(true);
        
        console.log('Sound created and playing');
      } catch (error) {
        console.error('Error setting up sound:', error);
      }
    };
    
    setupAndPlaySound();
    
    return () => {
      if (soundObject) {
        console.log('Cleaning up sound');
        try {
          soundObject.stopAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Simplify the stopSound function
  const stopSound = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        console.log('Sound stopped successfully');
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
    }
  };

  // Fix the handleStopAlarm function
  const handleStopAlarm = async () => {
    try {
      // Stop sound first
      if (sound) {
        try {
          await sound.stopAsync();
        } catch (error) {
          // Ignore errors, just continue
        }
      }
      
      // Stop vibration
      stopVibration();
      
      // Clear active alarm flags
      await AsyncStorage.removeItem('alarmRingActive');
      await AsyncStorage.removeItem('activeAlarm');
      
      // Navigate back to home screen
      router.replace('/');
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  };

  const handleSnooze = async () => {
    try {
      // Stop the sound first
      if (sound) {
        console.log('Stopping alarm sound from handleSnooze');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
      
      // Also stop any sound playing from notifications
      await stopAlarmSound();
      
      console.log('Snooze button pressed - navigating to snooze-confirmation');
      
      // Calculate snooze time based on settings
      const snoozeMinutes = currentAlarm?.snooze?.interval || 
                            currentAlarm?.snooze?.duration || 
                            snoozeDuration || 
                            5;
      
      // Calculate the new time for the snoozed alarm
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + snoozeMinutes);
      
      if (!currentAlarm) {
        console.error('No current alarm to snooze');
        return;
      }
      
      // Increment snooze count and save to AsyncStorage
      const newCount = snoozeCount + 1;
      const snoozeCountKey = `snoozeCount_${currentAlarm.id}`;
      await AsyncStorage.setItem(snoozeCountKey, newCount.toString());
      
      // Save snoozed alarm data for the confirmation screen
      await AsyncStorage.setItem('snoozedAlarm', JSON.stringify({
        alarmId: currentAlarm.id,
        hasMission: !!currentAlarm.mission,
        sound: currentAlarm.sound,
        soundVolume: currentAlarm.soundVolume
      }));
      
      // Schedule the actual alarm notification
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        const alarms = JSON.parse(alarmsJson);
        const originalAlarm = alarms.find((a: any) => a.id === currentAlarm.id);
        
        if (originalAlarm) {
          // Create a proper snoozed alarm that maintains the original structure
          const snoozeAlarm = {
            ...originalAlarm,
            time: `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`,
            enabled: true,
          };
          
          // Schedule the snoozed alarm
          const notificationId = await scheduleAlarmNotification(snoozeAlarm);
          
          if (notificationId) {
            // Update the notification ID for the snoozed alarm
            snoozeAlarm.notificationId = notificationId;
            
            // Update the alarm in storage
            const updatedAlarms = alarms.map((a: any) => 
              a.id === snoozeAlarm.id ? snoozeAlarm : a
            );
            
            // Save updated alarms
            await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
          }
        }
      }
      
      // IMPORTANT: Navigate to snooze confirmation screen AFTER all async operations
      console.log('All async operations complete, now navigating to snooze-confirmation');
      console.log('Snooze time:', snoozeTime.toISOString());
      console.log('Has mission:', !!currentAlarm.mission);
      
      // Use replace instead of push to avoid stacking screens
      router.replace({
        pathname: '/snooze-confirmation',
        params: {
          snoozeTime: snoozeTime.toISOString(),
          hasMission: currentAlarm.mission ? 'true' : 'false'
        }
      });
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      // Only navigate to home in case of error
      router.replace('/');
    }
  };

  const handleStartMission = async () => {
    try {
      // Stop the sound first
      if (sound) {
        console.log('Stopping alarm sound from handleStartMission');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
      
      // Also stop any sound playing from notifications
      await stopAlarmSound();
      
      console.log('Starting mission in alarm-ring screen with type:', missionType);
      
      // Navigate to the appropriate mission screen based on mission type
      if (missionType.toLowerCase() === 'tetris') {
        router.replace('/final-tetris');
      } else if (missionType.toLowerCase() === 'math') {
        router.replace('/final-math');
      } else if (missionType.toLowerCase() === 'typing') {
        router.replace('/final-typing');
      } else if (missionType.toLowerCase() === 'qr') {
        router.replace('/final-qr');
      } else if (missionType.toLowerCase() === 'wordle') {
        router.replace('/final-wordle');
      } else if (missionType.toLowerCase() === 'cookiejam') {
        router.replace('/final-cookiejam');
      } else {
        // Default to math if mission type is unknown
        console.warn('Unknown mission type:', missionType);
        router.replace('/final-math');
      }
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  // Update the getMissionType function to handle Steps case-insensitively
  const getMissionType = (mission: any): string => {
    if (!mission) return '';
    
    const missionName = mission.name?.toLowerCase() || '';
    const missionType = mission.settings?.type?.toLowerCase() || '';
    
    if (missionName === 'wordle' || missionType === 'wordle') {
      return 'Wordle';
    } else if (missionName === 'math' || missionType === 'math') {
      return 'Math';
    } else if (missionName === 'typing' || missionType === 'typing') {
      return 'Typing';
    } else if (missionName === 'qr/barcode' || missionType === 'qr') {
      return 'QR';
    } else if (missionName === 'steps' || missionType === 'steps') {
      return 'Steps';
    } else if (missionName === 'cookie jam' || missionType === 'cookiejam') {
      return 'CookieJam';
    }
    
    return '';
  };

  // Update the getCurrentAlarm function to use the route params if no currentAlarmId is found
  const getCurrentAlarm = async (): Promise<Alarm | null> => {
    try {
      // Try to get the current alarm ID from AsyncStorage
      let currentAlarmId = await AsyncStorage.getItem('currentAlarmId');
      
      // If no ID in AsyncStorage, try to get it from route params
      if (!currentAlarmId && params.alarmId) {
        currentAlarmId = params.alarmId as string;
        console.log('Using alarmId from params:', currentAlarmId);
        
        // Save it to AsyncStorage for future use
        await AsyncStorage.setItem('currentAlarmId', currentAlarmId);
      }
      
      if (!currentAlarmId) {
        console.error('No current alarm ID found in storage or params');
        return null;
      }
      
      // Get all alarms
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        console.error('No alarms found in storage');
        return null;
      }
      
      // Find the current alarm
      const alarms = JSON.parse(alarmsJson);
      const currentAlarm = alarms.find((alarm: Alarm) => alarm.id === currentAlarmId);
      
      if (!currentAlarm) {
        console.error('Current alarm not found in alarms list');
        return null;
      }
      
      console.log('Found current alarm:', currentAlarm);
      return currentAlarm;
    } catch (error) {
      console.error('Error getting current alarm:', error);
      return null;
    }
  };

  // Make sure we have this function defined
  const cancelAllNotifications = async () => {
    try {
      console.log('Cancelling all scheduled notifications when alarm screen opened');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  };

  // Fix the loadAlarmData function
  const loadAlarmData = async () => {
    try {
      // First try to get alarm ID from params
      let alarmId = params.alarmId as string;
      
      // If no alarm ID in params, check active alarm in storage
      if (!alarmId) {
        const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
        if (activeAlarmJson) {
          const activeAlarm = JSON.parse(activeAlarmJson);
          alarmId = activeAlarm.alarmId;
        }
      }
      
      if (!alarmId) {
        console.error('No alarm ID found in params or storage');
        return;
      }
      
      // Load the full alarm data
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        console.error('No alarms found in storage');
        return;
      }
      
      const alarms = JSON.parse(alarmsJson);
      const alarm = alarms.find((a: any) => a.id === alarmId);
      
      if (!alarm) {
        console.error(`Alarm with ID ${alarmId} not found`);
        return;
      }
      
      // Only log once
      console.log('Loaded alarm data:', alarm);
      
      // Set all state at once to reduce re-renders
      setCurrentAlarm(alarm);
      
      // Set up mission if present
      if (alarm.mission) {
        setHasMission(true);
        setMissionType(alarm.mission.name || '');
      }
      
      // Set up snooze settings
      if (alarm.snooze) {
        setSnoozeEnabled(alarm.snooze.enabled);
        if (alarm.snooze.interval) setSnoozeDuration(alarm.snooze.interval);
        if (alarm.snooze.maxSnoozes) {
          setSnoozeLimit(alarm.snooze.maxSnoozes);
          setSnoozeRemaining(alarm.snooze.maxSnoozes);
        }
      }
      
      // Set the active alarm flag to prevent stopping
      await AsyncStorage.setItem('alarmRingActive', 'true');
    } catch (error) {
      console.error('Error loading alarm data:', error);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade'
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Wake Up!</Text>
          <Text style={styles.subtitle}>
            {currentAlarm?.label || "It's time to rise and shine"}
          </Text>
          
          <View style={styles.buttonContainer}>
            {missionFailed ? (
              // Show these buttons when returning from a failed mission
              <>
                {currentAlarm?.mission && (
                  <TouchableOpacity 
                    style={[styles.button, styles.retryButton]} 
                    onPress={handleStartMission}
                  >
                    <Text style={styles.buttonText}>Retry Mission</Text>
                  </TouchableOpacity>
                )}
                
                {snoozeEnabled && snoozeRemaining > 0 && (
                  <TouchableOpacity 
                    style={[styles.button, styles.snoozeButton]} 
                    onPress={handleSnooze}
                  >
                    <Text style={styles.buttonText}>Snooze</Text>
                  </TouchableOpacity>
                )}
                
                {!currentAlarm?.mission && (
                  <TouchableOpacity 
                    style={[styles.button, styles.stopButton]} 
                    onPress={handleStopAlarm}
                  >
                    <Text style={styles.buttonText}>Stop Alarm</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // Show the regular buttons when alarm first rings
              <>
                {currentAlarm?.mission ? (
                  <TouchableOpacity 
                    style={[styles.button, styles.missionButton]} 
                    onPress={handleStartMission}
                  >
                    <Text style={styles.buttonText}>Start Mission</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.button, styles.stopButton]} 
                    onPress={handleStopAlarm}
                  >
                    <Text style={styles.buttonText}>Stop Alarm</Text>
                  </TouchableOpacity>
                )}
                
                {snoozeEnabled && snoozeRemaining > 0 && (
                  <TouchableOpacity 
                    style={[styles.button, styles.snoozeButton]} 
                    onPress={handleSnooze}
                  >
                    <Text style={styles.buttonText}>Snooze</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 40,
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
  snoozeButton: {
    backgroundColor: '#FF9500',
  },
  retryButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 