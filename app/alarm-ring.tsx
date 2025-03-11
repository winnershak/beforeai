import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Vibration } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { scheduleAlarmNotification, stopAlarmSound, cancelAllNotifications, resetAlarmState } from './notifications';
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

  console.log('AlarmRingScreen params:', params);

  // Add this useEffect to ensure the alarm-ring screen is properly displayed
  useEffect(() => {
    // This will run when the alarm-ring screen is mounted
    console.log('AlarmRingScreen mounted');
    
    // Cancel all notifications when alarm screen is opened
    Notifications.cancelAllScheduledNotificationsAsync()
      .then(() => console.log('Cancelled all scheduled notifications when alarm screen opened'))
      .catch(error => console.error('Error cancelling notifications:', error));
    
    // Make sure we have the current alarm data
    const checkCurrentAlarmData = async () => {
      try {
        // If we don't have an alarmId in params, try to get it from storage
        if (!params.alarmId) {
          const activeAlarmJson = await AsyncStorage.getItem('currentAlarmData');
          if (activeAlarmJson) {
            const activeAlarmData = JSON.parse(activeAlarmJson);
            
            // If we have active alarm data, load that alarm
            if (activeAlarmData && activeAlarmData.alarmId) {
              console.log('Found active alarm data:', activeAlarmData);
              
              // Update params with the alarm ID
              Object.assign(params, { 
                alarmId: activeAlarmData.alarmId,
                sound: activeAlarmData.sound,
                soundVolume: activeAlarmData.soundVolume
              });
              
              // Call loadAlarm if it's available
              if (loadAlarmRef.current) {
                loadAlarmRef.current();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking current alarm data:', error);
      }
    };
    
    checkCurrentAlarmData();
    
    // Start vibration if enabled
    if (currentAlarm?.vibration !== false) {
      startVibration();
    }
    
    // Clean up when component unmounts
    return () => {
      stopVibration();
      stopSound();
    };
  }, []);

  // Play alarm sound only once
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // Cancel all scheduled notifications since we're now showing the alarm screen
    Notifications.cancelAllScheduledNotificationsAsync().then(() => {
      console.log('Cancelled all scheduled notifications when alarm screen opened');
    }).catch(error => {
      console.error('Error cancelling notifications:', error);
    });
    
    let soundInstance: Audio.Sound | null = null;
    
    const playSound = async () => {
      try {
        // Check if sound should be disabled (for testing)
        if (params.disableSound === 'true') {
          console.log('Sound disabled per request');
          return;
        }
        
        console.log('Loading sound with params:', params);
        
        // Use a default sound if none is specified
        const soundName = params.sound as string || 'Beacon';
        console.log('Using sound:', soundName);
        
        // Configure audio session first
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // DuckOthers = 1
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // DuckOthers = 1
          playThroughEarpieceAndroid: false
        });
        
        console.log('Audio mode configured for alarm');
        
        // Map sound names to their files
        let soundFile;
        switch(soundName) {
          case 'Beacon':
            soundFile = require('../assets/sounds/beacon.caf');
            break;
          case 'Chimes':
            soundFile = require('../assets/sounds/chimes.caf');
            break;
          case 'Circuit':
            soundFile = require('../assets/sounds/circuit.caf');
            break;
          case 'Orkney':
            soundFile = require('../assets/sounds/orkney.caf');
            break;
          case 'Radar':
            soundFile = require('../assets/sounds/radar.caf');
            break;
          case 'Reflection':
            soundFile = require('../assets/sounds/reflection.caf');
            break;
          default:
            // Use Beacon as default if no valid sound is specified
            soundFile = require('../assets/sounds/beacon.caf');
            break;
        }
        
        console.log('Using sound file:', soundFile);
        
        // Load and play the sound
        const { sound } = await Audio.Sound.createAsync(
          soundFile,
          {
            shouldPlay: true,
            isLooping: true,
            volume: parseFloat(params.soundVolume as string) || 1.0
          }
        );
        
        soundInstance = sound;
        setSound(sound);
        setIsPlaying(true);
        
        // Set up a status update listener
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            if (!status.isPlaying && status.shouldPlay && isPlaying) {
              console.log('Sound stopped unexpectedly, restarting...');
              sound.playAsync().catch(err => {
                if (err.message?.includes('not loaded')) {
                  console.log('Sound was unloaded, cannot restart');
                  setIsPlaying(false);
                } else {
                  console.error('Error restarting sound:', err);
                }
              });
            }
          }
        });
        
        // Start playing the sound
        await sound.playAsync();
        console.log('Alarm sound started playing');
        
      } catch (error) {
        console.error('Error playing alarm sound:', error);
      }
    };
    
    // Load the alarm data
    const loadAlarm = async () => {
      try {
        console.log('Loading alarm with ID:', params.alarmId);
        
        // Get all alarms from storage
        const alarmsJson = await AsyncStorage.getItem('alarms');
        const alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
        console.log('Found alarms:', alarms.length);
        
        // First try to find the alarm by ID from params
        let alarm = alarms.find((a: Alarm) => a.id === params.alarmId);
        
        // If not found by ID from params, check if we have an active alarm in storage
        if (!alarm) {
          const activeAlarmJson = await AsyncStorage.getItem('currentAlarmData');
          if (activeAlarmJson) {
            const activeAlarmData = JSON.parse(activeAlarmJson);
            // Try to find this alarm in our alarms list
            alarm = alarms.find((a: Alarm) => a.id === activeAlarmData.alarmId);
            
            // If still not found, use the active alarm data directly
            if (!alarm && activeAlarmData.alarmId) {
              console.log('Using active alarm data:', activeAlarmData);
              // Create a temporary alarm object from the active alarm data
              alarm = {
                id: activeAlarmData.alarmId,
                time: new Date().toLocaleTimeString(),
                enabled: true,
                days: [],
                label: 'Alarm',
                sound: activeAlarmData.sound || 'Beacon',
                soundVolume: activeAlarmData.soundVolume || 1,
                vibration: true,
                mission: activeAlarmData.mission,
                snooze: {
                  enabled: true,
                  maxSnoozes: 3,
                  interval: 5
                }
              };
            }
          }
        }
        
        if (!alarm) {
          console.error('Alarm not found with ID:', params.alarmId);
          // Create a default alarm if none is found
          setCurrentAlarm({
            id: 'default_alarm',
            time: new Date().toLocaleTimeString(),
            enabled: true,
            days: [],
            label: 'Alarm',
            sound: 'Beacon',
            soundVolume: 1.0,
            vibration: true,
            snooze: {
              enabled: true,
              maxSnoozes: 3,
              interval: 5
            }
          });
        } else {
          console.log('Found alarm:', alarm);
          setCurrentAlarm(alarm);
          
          // Set snooze settings
          if (alarm.snooze) {
            setSnoozeEnabled(alarm.snooze.enabled !== false);
            setSnoozeLimit(alarm.snooze.maxSnoozes || 3);
            setSnoozeDuration(alarm.snooze.interval || 5);
            setSnoozeRemaining(alarm.snooze.maxSnoozes || 3);
          }
          
          // Check if this alarm has a mission
          if (alarm.mission) {
            setHasMission(true);
            setMissionType(typeof alarm.mission === 'string' ? alarm.mission : alarm.mission.name || 'unknown');
          }
        }
        
        // Play the alarm sound
        playSound();
        
      } catch (error) {
        console.error('Error loading alarm:', error);
        // Play default sound anyway
        playSound();
      }
    };
    
    // Store the function in the ref so it can be used elsewhere
    loadAlarmRef.current = loadAlarm;
    
    // Cleanup function
    return () => {
      if (soundInstance) {
        console.log('Cleaning up sound in useEffect');
        soundInstance.stopAsync().catch(() => {});
        soundInstance.unloadAsync().catch(() => {});
      }
    };
  }, [params]);

  const stopSound = async () => {
    try {
      // Stop notification sound first
      await stopAlarmSound();
      
      // Then stop local sound if it exists and is playing
      if (sound && isPlaying) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping sound (non-critical):', error);
      // Continue with navigation even if sound stopping fails
    }
  };

  const handleStopAlarm = async () => {
    try {
      // Stop the sound
      if (sound) {
        console.log('Stopping alarm sound from handleStopAlarm');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
      
      // Also stop any sound playing from notifications
      await stopAlarmSound();
      
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
      
      // Reset alarm state
      resetAlarmState();
      
      // Clear the current alarm data from AsyncStorage
      await AsyncStorage.removeItem('currentAlarmData');
      console.log('Cleared current alarm data from storage');
      
      // Update the alarm if it's a one-time alarm
      if (params.isOneTimeAlarm === 'true') {
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (alarmsJson) {
          const alarms = JSON.parse(alarmsJson);
          const updatedAlarms = alarms.map((alarm: Alarm) => {
            if (alarm.id === params.alarmId) {
              return { ...alarm, enabled: false };
            }
            return alarm;
          });
          await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
        }
      }
      
      // Navigate back
      router.back();
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