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

  // Update the useEffect that runs when the component mounts
  useEffect(() => {
    console.log('AlarmRingScreen mounted');
    
    // Start vibration
    if (params.vibration !== 'false') {
      startVibration();
    }
    
    // Load alarm data - use the ref function instead of direct call
    if (loadAlarmRef.current) {
      loadAlarmRef.current();
    }
    
    // Cancel ALL notifications when alarm screen is opened
    // This ensures no more notifications will appear
    cancelAllNotifications();
    
    return () => {
      // Clean up when component unmounts
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
            console.log('No valid sound specified, using default Beacon sound');
            soundFile = require('../assets/sounds/beacon.caf');
            break;
        }
        
        console.log('Using sound file:', soundFile);
        
        // Get the volume from params or use default
        const volume = parseFloat(params.soundVolume as string) || 1.0;
        console.log('Using volume:', volume);
        
        // Load and play the sound
        const { sound } = await Audio.Sound.createAsync(
          soundFile,
          {
            shouldPlay: true,
            isLooping: true,
            volume: volume
          }
        );
        
        soundInstance = sound;
        setSound(sound);
        setIsPlaying(true);
        
        // Set up a status update listener
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            if (!status.isPlaying && status.shouldPlay && isPlaying) {
              console.log('Sound stopped playing but alarm is still active, restarting...');
              // Check if sound is still loaded before trying to restart
              sound.getStatusAsync().then(currentStatus => {
                if (currentStatus.isLoaded) {
                  sound.playAsync().catch(err => {
                    console.log('Could not restart sound, loading a new instance');
                    // Instead of showing an error, just reload the sound
                    playSound();
                  });
                } else {
                  console.log('Sound is no longer loaded, loading a new instance');
                  // Reload the sound instead of just updating state
                  playSound();
                }
              }).catch(() => {
                console.log('Could not get sound status, loading a new instance');
                // Reload the sound
                playSound();
              });
            }
          } else {
            // Sound is no longer loaded
            console.log('Sound is no longer loaded, loading a new instance');
            // Reload the sound instead of just updating state
            playSound();
          }
        });
        
        // Start playing the sound
        await sound.playAsync();
        console.log('Alarm sound started playing with sound:', soundName, 'at volume:', volume);
        
      } catch (error) {
        console.error('Error playing alarm sound:', error);
      }
    };
    
    // Load the alarm data
    const loadAlarm = async () => {
      try {
        if (params.alarmId) {
          console.log('Loading alarm with ID:', params.alarmId);
          
          // Get alarms from storage
          const alarmsJson = await AsyncStorage.getItem('alarms');
          if (alarmsJson) {
            const alarms = JSON.parse(alarmsJson);
            console.log('Found alarms:', alarms.length);
            
            // Find the alarm with the matching ID
            const alarm = alarms.find((a: Alarm) => a.id === params.alarmId);
            
            if (alarm) {
              console.log('Found alarm:', alarm);
              setCurrentAlarm(alarm);
              
              // Check if the alarm has a mission
              if (alarm.mission) {
                console.log('Alarm has mission:', alarm.mission);
                setHasMission(true);
                
                // Handle both string and object mission types
                if (typeof alarm.mission === 'string') {
                  setMissionType(alarm.mission);
                } else if (typeof alarm.mission === 'object') {
                  // Extract mission type from the mission object
                  setMissionType(alarm.mission.name || '');
                }
              } else if (params.hasMission === 'true' && params.mission) {
                // If mission is in params but not in alarm, use that
                console.log('Using mission from params:', params.mission);
                setHasMission(true);
                
                try {
                  // Try to parse the mission from params
                  const missionData = JSON.parse(params.mission as string);
                  console.log('Parsed mission data:', missionData);
                  setMissionType(missionData.name || '');
                } catch (error) {
                  // If parsing fails, use the mission string directly
                  console.log('Using mission string directly:', params.mission);
                  setMissionType(params.mission as string);
                }
              }
              
              // Check snooze settings
              if (alarm.snooze) {
                setSnoozeEnabled(alarm.snooze.enabled !== false);
                setSnoozeDuration(alarm.snooze.interval || 5);
                setSnoozeLimit(alarm.snooze.maxSnoozes || 3);
                setSnoozeRemaining(alarm.snooze.maxSnoozes || 3);
              }
              
              // Disable the alarm after it has triggered
              if (alarm.enabled) {
                // Create a copy of the alarm with enabled set to false
                const updatedAlarm = { ...alarm, enabled: false };
                
                // Update the alarm in the alarms array
                const updatedAlarms = alarms.map((a: Alarm) => 
                  a.id === updatedAlarm.id ? updatedAlarm : a
                );
                
                // Save the updated alarms
                await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
                console.log('Disabled alarm after triggering');
              }
            } else {
              console.log('Alarm not found with ID:', params.alarmId);
              
              // If we can't find the alarm but have mission data in params, use that
              if (params.hasMission === 'true' && params.mission) {
                console.log('Using mission from params as fallback:', params.mission);
                setHasMission(true);
                
                try {
                  // Try to parse the mission from params
                  const missionData = JSON.parse(params.mission as string);
                  console.log('Parsed mission data:', missionData);
                  setMissionType(missionData.name || '');
                } catch (error) {
                  // If parsing fails, use the mission string directly
                  console.log('Using mission string directly:', params.mission);
                  setMissionType(params.mission as string);
                }
              }
            }
          } else {
            console.log('No alarms found in storage');
            
            // If we have mission data in params, use that
            if (params.hasMission === 'true' && params.mission) {
              console.log('Using mission from params (no alarms in storage):', params.mission);
              setHasMission(true);
              
              try {
                // Try to parse the mission from params
                const missionData = JSON.parse(params.mission as string);
                console.log('Parsed mission data:', missionData);
                setMissionType(missionData.name || '');
              } catch (error) {
                // If parsing fails, use the mission string directly
                console.log('Using mission string directly:', params.mission);
                setMissionType(params.mission as string);
              }
            }
          }
        } else if (params.hasMission === 'true' && params.mission) {
          // Handle case where we have mission data but no alarm ID
          console.log('No alarm ID but has mission data:', params.mission);
          setHasMission(true);
          
          try {
            // Try to parse the mission from params
            const missionData = JSON.parse(params.mission as string);
            console.log('Parsed mission data:', missionData);
            setMissionType(missionData.name || '');
          } catch (error) {
            // If parsing fails, use the mission string directly
            console.log('Using mission string directly:', params.mission);
            setMissionType(params.mission as string);
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
    
    // Call loadAlarm when the component mounts
    loadAlarm();
    
    // Cleanup function
    return () => {
      if (soundInstance) {
        console.log('Cleaning up sound in useEffect');
        try {
          // Check if the sound is loaded before trying to stop it
          soundInstance.getStatusAsync().then(status => {
            if (status.isLoaded) {
              if (status.isLoaded && soundInstance) {
                soundInstance.stopAsync().then(() => {
                  if (soundInstance) {
                    soundInstance.unloadAsync().catch(() => {});
                  }
                }).catch(() => {});
              }
            }
          }).catch(() => {
            // If we can't get the status, just try to unload directly
            if (soundInstance) {
              soundInstance.unloadAsync().catch(() => {});
            }
          });
        } catch (e) {
          console.log('Error during sound cleanup (non-critical):', e);
        }
      }
    };
  }, [params]);

  const stopSound = async () => {
    try {
      console.log('Stopping alarm sound');
      
      // First try to stop the sound using the local sound instance
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
          console.log('Sound stopped and unloaded');
        }
        setSound(null);
      }
      
      // Also call the global stopAlarmSound function to ensure all sounds are stopped
      if (typeof stopAlarmSound === 'function') {
        await stopAlarmSound();
      }
      
      // Reset the global sound variable as well
      if (global.currentAlarmSound) {
        try {
          const status = await global.currentAlarmSound.getStatusAsync();
          if (status.isLoaded) {
            await global.currentAlarmSound.stopAsync();
            await global.currentAlarmSound.unloadAsync();
          }
        } catch (error) {
          console.log('Error stopping global sound:', error);
        }
        global.currentAlarmSound = null;
      }
      
      // Reset audio mode to default
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: 1, // Use numeric value instead of constant
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        interruptionModeAndroid: 1, // Use numeric value instead of constant
        playThroughEarpieceAndroid: false
      });
      
      console.log('Audio mode reset to default');
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping sound:', error);
    }
  };

  const handleStopAlarm = async () => {
    try {
      console.log('Stopping alarm sound from handleStopAlarm');
      
      // Stop vibration
      stopVibration();
      
      // Stop sound
      await stopSound();
      
      // Cancel all notifications
      await cancelAllNotifications();
      
      // Reset alarm state in notifications.ts
      resetAlarmState();
      
      // Clear current alarm data
      await AsyncStorage.removeItem('currentAlarmData');
      await AsyncStorage.removeItem('activeAlarm');
      console.log('Cleared current alarm data from storage');
      
      // Navigate back to home screen
      router.replace('/');
    } catch (error) {
      console.error('Error stopping alarm:', error);
      // Try to navigate anyway
      router.replace('/');
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