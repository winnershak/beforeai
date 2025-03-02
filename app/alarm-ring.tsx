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

  console.log('AlarmRingScreen params:', params);

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
        
        // Instead, initialize with null and only set when a valid sound is found
        let soundFile = null;
        
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
              // Use Beacon as default if no valid sound is specified
              soundFile = require('../assets/sounds/beacon.caf');
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
        
        // Start vibration if enabled
        if (params.vibration === 'true') {
          const pattern = [1000, 500, 1000, 500]; // Vibrate for 1s, pause for 0.5s, repeat
          Vibration.vibrate(pattern, true);
        }
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
      
      // Stop vibration
      Vibration.cancel();
      
      // Also stop any sound from notifications
      stopAlarmSound().catch(err => {
        console.log('Error stopping notification sound:', err);
      });
    };
  }, []); // Empty dependency array - only run once

  // Load alarm details and check for mission failure
  useEffect(() => {
    const loadAlarm = async () => {
      try {
        console.log('Loading alarm with ID:', params.alarmId);
        
        // Check if this is a mission failure return
        if (params.missionFailed === 'true') {
          console.log('User returned from failed mission');
          setMissionFailed(true);
        }
        
        // Get alarms from AsyncStorage
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) {
          console.error('No alarms found in storage');
          return;
        }
        
        const alarms = JSON.parse(alarmsJson);
        console.log('Found alarms:', alarms.length);
        
        const alarm = alarms.find((a: any) => a.id === params.alarmId);
        
        if (!alarm) {
          console.error('Alarm not found with ID:', params.alarmId);
          return;
        }
        
        console.log('Found alarm:', JSON.stringify(alarm, null, 2));
        setCurrentAlarm(alarm);
        
        // Check if alarm has a mission
        if (alarm.mission) {
          console.log('Alarm has mission:', alarm.mission);
          setHasMission(true);
        } else {
          console.log('Alarm has no mission');
          setHasMission(false);
        }
        
        // Reset snooze count when alarm first loads
        const snoozeCountKey = `snoozeCount_${alarm.id}`;
        await AsyncStorage.removeItem(snoozeCountKey);
        setSnoozeCount(0);
        
        // Load snooze settings
        if (alarm.snooze) {
          console.log('Alarm has snooze settings:', alarm.snooze);
          
          // Check for different property names
          const enabled = alarm.snooze.enabled !== undefined ? alarm.snooze.enabled : true;
          const duration = alarm.snooze.duration || alarm.snooze.interval || 5;
          const limit = alarm.snooze.limit || alarm.snooze.maxSnoozes || 3;
          
          setSnoozeEnabled(enabled);
          setSnoozeDuration(duration);
          setSnoozeLimit(limit);
          
          // Get current snooze count from AsyncStorage
          const storedCount = await AsyncStorage.getItem(snoozeCountKey);
          const currentCount = storedCount ? parseInt(storedCount) : 0;
          setSnoozeCount(currentCount);
          
          // Calculate remaining snoozes
          const remaining = Math.max(0, limit - currentCount);
          setSnoozeRemaining(remaining);
          
          console.log('Snooze settings loaded:', { 
            enabled: enabled, 
            duration: duration,
            limit: limit,
            count: currentCount,
            remaining: remaining
          });
        } else {
          // Default settings if not specified - assume snooze is enabled
          setSnoozeEnabled(true);
          setSnoozeDuration(5);
          setSnoozeLimit(3);
          setSnoozeCount(0);
          setSnoozeRemaining(3);
          console.log('No snooze settings found, using defaults with snooze enabled');
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
      
      // Stop vibration
      Vibration.cancel();
    } catch (error) {
      console.error('Error stopping sound (non-critical):', error);
      // Continue with navigation even if sound stopping fails
    }
  };

  const handleStopAlarm = async () => {
    try {
      // Stop the sound
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Stop vibration
      Vibration.cancel();
      
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
      
      // Reset alarm state
      resetAlarmState();
      
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
      console.log('Snooze button pressed - navigating to snooze-confirmation');
      
      // Stop the current alarm sound
      await stopSound();
      
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
      // Prevent multiple mission starts
      if (hasMissionStarted.current) {
        console.log('Mission already started, ignoring duplicate request');
        return;
      }
      
      hasMissionStarted.current = true;
      
      if (!currentAlarm) {
        console.error('No current alarm found');
        hasMissionStarted.current = false;
        return;
      }
      
      if (!currentAlarm.mission) {
        console.error('No mission found in alarm');
        hasMissionStarted.current = false;
        return;
      }
      
      console.log('Starting mission for alarm:', currentAlarm.id);
      console.log('Mission data:', JSON.stringify(currentAlarm.mission, null, 2));
      
      // Stop the sound before navigating to mission screen
      await stopSound();
      
      // Cancel all scheduled notifications since we're now showing the mission screen
      await Notifications.cancelAllScheduledNotificationsAsync().catch(error => {
        console.error('Error cancelling notifications:', error);
      });
      
      // Extract mission type
      let missionType = '';
      
      if (typeof currentAlarm.mission === 'string') {
        missionType = currentAlarm.mission;
      } else if (currentAlarm.mission.name) {
        missionType = currentAlarm.mission.name;
      } else if (currentAlarm.mission.type) {
        missionType = currentAlarm.mission.type;
      } else if (currentAlarm.mission.settings?.type) {
        missionType = currentAlarm.mission.settings.type;
      }
      
      console.log('Mission type determined as:', missionType);
      
      // Convert to lowercase for comparison
      const missionTypeLower = missionType.toLowerCase();
      
      // Navigate to mission screen with a slight delay to ensure clean navigation
      setTimeout(() => {
        // Handle each mission type based on what the mission screens expect
        switch (missionTypeLower) {
          case 'math':
            // Load the saved math settings from AsyncStorage
            AsyncStorage.getItem('mathSettings').then(mathSettingsJson => {
              console.log('Raw math settings JSON:', mathSettingsJson);
              
              if (!mathSettingsJson) {
                console.log('No math settings found, using defaults');
                router.replace({
                  pathname: '/final-math',
                  params: {
                    alarmId: currentAlarm.id,
                    difficulty: 'medium',
                    times: '1',
                    timeLimit: '30',
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
                return;
              }
              
              // Parse the settings
              const mathSettings = JSON.parse(mathSettingsJson);
              console.log('Parsed math settings:', mathSettings);
              
              // Extract the raw values directly without interpretation
              const rawDifficulty = mathSettings.difficulty || 'medium';
              const rawTimes = mathSettings.times || '1';
              const rawTimeLimit = mathSettings.timeLimit || '30';
              
              console.log('Math mission with raw settings:', { 
                difficulty: rawDifficulty, 
                times: rawTimes, 
                timeLimit: rawTimeLimit 
              });
              
              // Pass the raw values to final-math.tsx
              router.replace({
                pathname: '/final-math',
                params: {
                  alarmId: currentAlarm.id,
                  difficulty: rawDifficulty.toString(),
                  times: rawTimes.toString(),
                  timeLimit: rawTimeLimit.toString(),
                  sound: currentAlarm.sound,
                  soundVolume: currentAlarm.soundVolume?.toString() || '1'
                }
              });
            }).catch(error => {
              console.error('Error loading math settings:', error);
              hasMissionStarted.current = false;
            });
            break;
            
          case 'typing':
            // Load the saved typing settings from AsyncStorage
            AsyncStorage.getItem('typingSettings').then(typingSettingsJson => {
              console.log('Raw typing settings JSON:', typingSettingsJson);
              
              if (!typingSettingsJson) {
                console.log('No typing settings found, using defaults');
                router.replace({
                  pathname: '/final-typing',
                  params: {
                    alarmId: currentAlarm.id,
                    text: 'The quick brown fox jumps over the lazy dog',
                    caseSensitive: 'false',
                    timeLimit: '30',
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
                return;
              }
              
              // Parse the settings
              const typingSettings = JSON.parse(typingSettingsJson);
              console.log('Parsed typing settings:', typingSettings);
              
              // Extract the raw values directly without interpretation
              const rawPhrase = typingSettings.phrase || 'The quick brown fox jumps over the lazy dog';
              const rawCaseSensitive = typingSettings.caseSensitive !== undefined ? 
                                      typingSettings.caseSensitive.toString() : 'false';
              const rawTypingTimeLimit = typingSettings.timeLimit || '30';
              
              console.log('Typing mission with raw settings:', { 
                phrase: rawPhrase, 
                caseSensitive: rawCaseSensitive, 
                timeLimit: rawTypingTimeLimit 
              });
              
              // Pass the raw values to final-typing.tsx
              router.replace({
                pathname: '/final-typing',
                params: {
                  alarmId: currentAlarm.id,
                  text: rawPhrase,
                  caseSensitive: rawCaseSensitive,
                  timeLimit: rawTypingTimeLimit.toString(),
                  sound: currentAlarm.sound,
                  soundVolume: currentAlarm.soundVolume?.toString() || '1'
                }
              });
            }).catch(error => {
              console.error('Error loading typing settings:', error);
              hasMissionStarted.current = false;
            });
            break;
            
          case 'qr':
          case 'qr/barcode':
            // Load the saved QR settings from AsyncStorage
            AsyncStorage.getItem('qrSettings').then(qrSettingsJson => {
              console.log('Raw QR settings JSON:', qrSettingsJson);
              
              if (!qrSettingsJson) {
                console.log('No QR settings found, using defaults');
                router.replace({
                  pathname: '/final-qr',
                  params: {
                    alarmId: currentAlarm.id,
                    targetCode: '',
                    timeLimit: '30',
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
                return;
              }
              
              // Parse the settings
              const qrSettings = JSON.parse(qrSettingsJson);
              console.log('Parsed QR settings:', qrSettings);
              
              // Extract the raw values directly without interpretation
              const rawTargetCode = qrSettings.targetCode || '';
              const rawQrTimeLimit = qrSettings.timeLimit || '30';
              
              console.log('QR mission with raw settings:', { 
                targetCode: rawTargetCode, 
                timeLimit: rawQrTimeLimit 
              });
              
              // Pass the raw values to final-qr.tsx
              router.replace({
                pathname: '/final-qr',
                params: {
                  alarmId: currentAlarm.id,
                  targetCode: rawTargetCode,
                  timeLimit: rawQrTimeLimit.toString(),
                  sound: currentAlarm.sound,
                  soundVolume: currentAlarm.soundVolume?.toString() || '1'
                }
              });
            }).catch(error => {
              console.error('Error loading QR settings:', error);
              hasMissionStarted.current = false;
            });
            break;
            
          case 'photo':
            // Load the saved photo settings from AsyncStorage
            AsyncStorage.getItem('photoSettings').then(photoSettingsJson => {
              console.log('Raw photo settings JSON:', photoSettingsJson);
              
              if (!photoSettingsJson) {
                console.log('No photo settings found, using defaults');
                router.replace({
                  pathname: '/final-photo',
                  params: {
                    alarmId: currentAlarm.id,
                    targetPhoto: '',
                    timeLimit: '30',
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
                return;
              }
              
              // Parse the settings
              const photoSettings = JSON.parse(photoSettingsJson);
              console.log('Parsed photo settings:', photoSettings);
              
              // Extract the raw values directly without interpretation
              const rawPhotoUri = photoSettings.photo || '';
              const rawPhotoTimeLimit = photoSettings.timeLimit || '30';
              
              console.log('Photo mission with raw settings:', { 
                photoUri: rawPhotoUri, 
                timeLimit: rawPhotoTimeLimit 
              });
              
              // Pass the raw values to final-photo.tsx
              router.replace({
                pathname: '/final-photo',
                params: {
                  alarmId: currentAlarm.id,
                  targetPhoto: rawPhotoUri,
                  timeLimit: rawPhotoTimeLimit.toString(),
                  sound: currentAlarm.sound,
                  soundVolume: currentAlarm.soundVolume?.toString() || '1'
                }
              });
            }).catch(error => {
              console.error('Error loading photo settings:', error);
              hasMissionStarted.current = false;
            });
            break;
            
          default:
            console.error('Unknown mission type:', missionType);
            // Default to math mission
            router.replace({
              pathname: '/final-math',
              params: {
                alarmId: currentAlarm.id,
                difficulty: 'medium',
                times: '1',
                timeLimit: '30',
                sound: currentAlarm.sound,
                soundVolume: currentAlarm.soundVolume?.toString() || '1'
              }
            });
            break;
        }
      }, 100);
    } catch (error) {
      console.error('Error starting mission:', error);
      hasMissionStarted.current = false;
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