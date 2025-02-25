import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { scheduleAlarmNotification, stopAlarmSound } from './notifications';

// Add this type definition at the top of your file
interface Alarm {
  id: string;
  label?: string;
  sound?: string;
  soundVolume?: number;
  mission?: any;
  snooze?: {
    enabled: boolean;
    duration: number;
    limit: number;
  };
  // Add other properties as needed
}

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasInitialized = useRef(false);
  const [missionFailed, setMissionFailed] = useState(false);
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [snoozeDuration, setSnoozeDuration] = useState(5); // Default 5 minutes
  const [snoozeLimit, setSnoozeLimit] = useState(3); // Default 3 snoozes
  const [snoozeRemaining, setSnoozeRemaining] = useState(3);
  const [currentAlarm, setCurrentAlarm] = useState<Alarm | null>(null);

  // Play alarm sound only once
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    let soundInstance: Audio.Sound | null = null;
    
    const playSound = async () => {
      try {
        console.log('Loading sound with params:', params);
        
        // Default sound file
        let soundFile = require('../assets/sounds/alarm.mp3');
        
        // Try to load specified sound if available
        if (params.sound) {
          const soundName = params.sound as string;
          console.log('Trying to load sound:', soundName);
          
          // Map sound names to their files
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
              // Keep default sound
              break;
          }
        }
        
        console.log('Using sound file:', soundFile);
        
        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        
        const { sound } = await Audio.Sound.createAsync(soundFile, {
          isLooping: true,
          volume: params.soundVolume ? parseFloat(params.soundVolume as string) : 1,
        });
        
        soundInstance = sound;
        setSound(sound);
        
        // Play the sound
        await sound.playAsync();
        setIsPlaying(true);
        
        // Set up status monitoring
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
          }
        });
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    };
    
    playSound();
    
    // Clean up
    return () => {
      if (soundInstance) {
        try {
          soundInstance.stopAsync().then(() => {
            soundInstance?.unloadAsync();
          }).catch(err => {
            console.log('Error cleaning up sound:', err);
          });
        } catch (error) {
          console.log('Error in cleanup:', error);
        }
      }
      
      // Also stop any sound from notifications
      stopAlarmSound().catch(err => {
        console.log('Error stopping notification sound:', err);
      });
    };
  }, []); // Empty dependency array - only run once

  // Update the useEffect to check for mission failure parameter
  useEffect(() => {
    const loadAlarm = async () => {
      try {
        // Check if this is a mission failure return
        if (params.missionFailed === 'true') {
          console.log('User returned from failed mission');
          setMissionFailed(true);
        }
        
        // Get alarms from AsyncStorage
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (alarmsJson) {
          const alarms = JSON.parse(alarmsJson);
          const alarm = alarms.find((a: any) => a.id === params.alarmId);
          
          if (alarm) {
            setCurrentAlarm(alarm);
            
            // Load snooze settings
            if (alarm.snooze !== undefined) {
              setSnoozeEnabled(alarm.snooze.enabled);
              setSnoozeDuration(alarm.snooze.duration || 5);
              setSnoozeLimit(alarm.snooze.limit || 3);
              
              // Get current snooze count from AsyncStorage
              const snoozeCountKey = `snoozeCount_${alarm.id}`;
              const storedCount = await AsyncStorage.getItem(snoozeCountKey);
              const currentCount = storedCount ? parseInt(storedCount) : 0;
              setSnoozeCount(currentCount);
              
              // Calculate remaining snoozes
              const remaining = Math.max(0, (alarm.snooze.limit || 3) - currentCount);
              setSnoozeRemaining(remaining);
              
              console.log('Loaded snooze settings:', { 
                enabled: alarm.snooze.enabled, 
                duration: alarm.snooze.duration,
                limit: alarm.snooze.limit,
                count: currentCount,
                remaining: remaining
              });
            } else {
              // Default settings if not specified
              setSnoozeEnabled(true);
              setSnoozeDuration(5);
              setSnoozeLimit(3);
              setSnoozeCount(0);
              setSnoozeRemaining(3);
              console.log('No snooze settings found, using defaults');
            }
            
            // Rest of existing code...
          }
        }
      } catch (error) {
        console.error('Error loading alarm:', error);
      }
    };
    
    loadAlarm();
  }, [params.alarmId, params.missionFailed]);

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
      await stopSound();
    } catch (error) {
      console.log('Error stopping alarm (continuing anyway):', error);
    }
    
    // Navigate regardless of sound stop success
    router.replace('/');
  };

  const handleSnooze = async () => {
    try {
      // Stop the current alarm sound
      await stopAlarmSound();
      
      // Calculate snooze time based on settings
      const snoozeMinutes = snoozeDuration || 5;
      console.log(`Snoozing alarm for ${snoozeMinutes} minutes`);
      
      // Increment snooze count and save to AsyncStorage
      const newCount = snoozeCount + 1;
      const snoozeCountKey = `snoozeCount_${currentAlarm?.id}`;
      await AsyncStorage.setItem(snoozeCountKey, newCount.toString());
      console.log(`Updated snooze count to ${newCount}`);
      
      // Schedule a new notification for the snooze time
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + snoozeMinutes);
      
      // Schedule the snoozed alarm
      await scheduleAlarmNotification({
        id: currentAlarm?.id || '',
        title: 'Snoozed Alarm',
        body: currentAlarm?.label || 'Wake up!',
        date: snoozeTime,
        sound: currentAlarm?.sound || 'default',
        soundVolume: currentAlarm?.soundVolume || 1.0
      });
      
      // Navigate back to home screen
      router.replace('/');
    } catch (error) {
      console.error('Error snoozing alarm:', error);
    }
  };

  const handleStartMission = async () => {
    try {
      // Get the alarm details to determine mission type
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) {
        console.error('No alarms found');
        return;
      }
      
      const alarms = JSON.parse(alarmsJson);
      const currentAlarm = alarms.find((a: any) => a.id === params.alarmId);
      
      if (!currentAlarm) {
        console.error('Alarm not found');
        return;
      }
      
      console.log('Current alarm:', JSON.stringify(currentAlarm));
      
      // Check if mission exists
      if (!currentAlarm.mission) {
        console.error('Mission not found in alarm');
        // Default to math mission if none specified
        router.push({
          pathname: '/final-math',
          params: {
            alarmId: params.alarmId,
            difficulty: 'medium',
            sound: params.sound,
            soundVolume: params.soundVolume
          }
        });
        return;
      }
      
      // Stop the sound before navigating to mission screen
      await stopSound();
      
      // Get mission type from the correct location in the data structure
      let missionType;
      
      if (typeof currentAlarm.mission === 'string') {
        // If mission is stored as a string
        missionType = currentAlarm.mission;
      } else if (typeof currentAlarm.mission === 'object') {
        // If mission is stored as an object with name property
        missionType = currentAlarm.mission.name;
      }
      
      console.log('Starting mission of type:', missionType);
      
      // Check for photo data in different possible locations
      let photoUri = null;
      if (currentAlarm.mission.photo) {
        photoUri = currentAlarm.mission.photo;
      } else if (currentAlarm.mission.settings?.photo) {
        photoUri = currentAlarm.mission.settings.photo;
      } else if (currentAlarm.mission.settings?.targetPhoto) {
        photoUri = currentAlarm.mission.settings.targetPhoto;
      } else if (currentAlarm.photo) {
        photoUri = currentAlarm.photo;
      }
      
      console.log('Photo URI found:', photoUri);
      
      // Convert mission type to lowercase for case-insensitive comparison
      const missionTypeLower = missionType?.toLowerCase();
      
      // Navigate based on mission type
      switch (missionTypeLower) {
        case 'math':
          router.push({
            pathname: '/final-math',
            params: {
              alarmId: params.alarmId,
              difficulty: currentAlarm.mission?.settings?.difficulty || 'medium',
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
          
        case 'photo':
          router.push({
            pathname: '/final-photo',
            params: {
              alarmId: params.alarmId,
              targetPhoto: photoUri || '',
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
          
        case 'qr/barcode':
          router.push({
            pathname: '/final-qr',
            params: {
              alarmId: params.alarmId,
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
          
        case 'qr':
          router.push({
            pathname: '/final-qr',
            params: {
              alarmId: params.alarmId,
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
          
        case 'typing':
          router.push({
            pathname: '/final-typing',
            params: {
              alarmId: params.alarmId,
              text: currentAlarm.mission?.settings?.phrase || 'The quick brown fox jumps over the lazy dog',
              caseSensitive: currentAlarm.mission?.settings?.caseSensitive || false,
              timeLimit: currentAlarm.mission?.settings?.timeLimit || 30,
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
          
        default:
          console.error('Unknown mission type:', missionType);
          // If mission type is unknown, default to math mission
          router.push({
            pathname: '/final-math',
            params: {
              alarmId: params.alarmId,
              difficulty: 'medium',
              sound: params.sound,
              soundVolume: params.soundVolume
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error starting mission:', error);
      // In case of error, default to math mission
      router.push({
        pathname: '/final-math',
        params: {
          alarmId: params.alarmId,
          difficulty: 'medium',
          sound: params.sound,
          soundVolume: params.soundVolume
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wake Up!</Text>
        <Text style={styles.subtitle}>It's time to rise and shine</Text>
        
        <View style={styles.buttonContainer}>
          {missionFailed ? (
            // Show these buttons when returning from a failed mission
            <>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={() => handleStartMission()}
              >
                <Text style={styles.buttonText}>Retry Mission</Text>
              </TouchableOpacity>
              
              {snoozeEnabled && snoozeRemaining > 0 && (
                <TouchableOpacity 
                  style={[styles.button, styles.snoozeButton]} 
                  onPress={handleSnooze}
                >
                  <Text style={styles.buttonText}>
                    Snooze {snoozeDuration}m ({snoozeRemaining} left)
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.button, styles.stopButton]} 
                onPress={handleStopAlarm}
              >
                <Text style={styles.buttonText}>Stop Alarm</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Show the regular buttons when alarm first rings
            <>
              <TouchableOpacity 
                style={[styles.button, styles.missionButton]} 
                onPress={() => handleStartMission()}
              >
                <Text style={styles.buttonText}>Start Mission</Text>
              </TouchableOpacity>
              
              {snoozeEnabled && snoozeRemaining > 0 && (
                <TouchableOpacity 
                  style={[styles.button, styles.snoozeButton]} 
                  onPress={handleSnooze}
                >
                  <Text style={styles.buttonText}>
                    Snooze {snoozeDuration}m ({snoozeRemaining} left)
                  </Text>
                </TouchableOpacity>
              )}
            </>
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