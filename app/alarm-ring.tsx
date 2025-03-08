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
        
        // Use a default sound if none is specified
        const soundName = params.sound as string || 'Beacon';
        console.log('Using sound:', soundName);
        
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
            if (!status.isPlaying && status.shouldPlay) {
              console.log('Sound stopped unexpectedly, restarting...');
              sound.playAsync().catch(err => console.error('Error restarting sound:', err));
            }
          }
        });
        
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    };
    
    // Load the alarm data
    const loadAlarm = async () => {
      try {
        const alarmId = params.alarmId as string;
        console.log('Loading alarm with ID:', alarmId);
        
        // If no alarm ID is provided, try to get it from AsyncStorage
        if (!alarmId) {
          const pendingNavData = await AsyncStorage.getItem('pendingAlarmNavigation');
          if (pendingNavData) {
            const navData = JSON.parse(pendingNavData);
            if (navData.params && navData.params.alarmId) {
              console.log('Found alarm ID in AsyncStorage:', navData.params.alarmId);
              // Use this alarm ID and other params
              const newParams = {
                ...params,
                alarmId: navData.params.alarmId,
                sound: navData.params.sound || 'Beacon',
                soundVolume: navData.params.soundVolume || 1.0
              };
              // Update params
              Object.assign(params, newParams);
            }
          }
        }
        
        // If we still don't have an alarm ID, use a default alarm
        if (!params.alarmId) {
          console.log('No alarm ID found, using default alarm settings');
          setCurrentAlarm({
            id: 'default',
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
          
          // Play default sound
          playSound();
          return;
        }
        
        // Load alarms from storage
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) {
          console.log('No alarms found in storage');
          return;
        }
        
        const alarms = JSON.parse(alarmsJson);
        console.log('Found alarms:', alarms.length);
        
        // Find the current alarm
        const alarm = alarms.find((a: Alarm) => a.id === params.alarmId);
        
        if (!alarm) {
          console.error('Alarm not found with ID:', params.alarmId);
          // Use default alarm settings
          setCurrentAlarm({
            id: 'default',
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
            setMissionType(alarm.mission.type || 'math');
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
    
    loadAlarm();
    
    // Cleanup function
    return () => {
      if (soundInstance) {
        soundInstance.stopAsync().catch(err => console.error('Error stopping sound:', err));
        soundInstance.unloadAsync().catch(err => console.error('Error unloading sound:', err));
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
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
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
      if (hasMissionStarted.current) return;
      hasMissionStarted.current = true;
      
      // Use the currentAlarm state variable instead of fetching it again
      if (!currentAlarm) {
        console.error('No current alarm found');
        hasMissionStarted.current = false;
        return;
      }
      
      // Get the mission type
      const mission = currentAlarm.mission;
      console.log('Mission object:', mission);
      
      // Determine mission type - check both name and settings.type
      let missionType = '';
      if (mission) {
        if (mission.name === 'Wordle' || mission.settings?.type === 'Wordle') {
          missionType = 'Wordle';
        } else if (mission.name === 'Math' || mission.settings?.type === 'Math') {
          missionType = 'Math';
        } else if (mission.name === 'Typing' || mission.settings?.type === 'Typing') {
          missionType = 'Typing';
        } else if (mission.name === 'QR/Barcode' || mission.settings?.type === 'QR') {
          missionType = 'QR';
        } else if (mission.name === 'Steps' || mission.settings?.type === 'Steps') {
          missionType = 'Steps';
        } else if (mission.name === 'Cookie Jam' || mission.settings?.type === 'CookieJam') {
          missionType = 'CookieJam';
        } else {
          missionType = mission.name || '';
        }
      }
      
      console.log('Detected mission type:', missionType);
      
      // Navigate based on mission type
      setTimeout(() => {
        switch (missionType.toLowerCase()) {
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
            
          case 'CookieJam':
          case 'cookiejam':
            console.log('Starting Cookie Jam mission');
            // Use Promise chain instead of await
            AsyncStorage.setItem('missionInProgress', 'true')
              .then(() => {
                // Set the current alarm ID for the mission
                if (currentAlarm.id) {
                  return AsyncStorage.setItem('currentAlarmId', currentAlarm.id);
                }
                return Promise.resolve();
              })
              .then(() => {
                // Navigate to the Cookie Jam game
                console.log('Navigating to cookie jam with params:', { 
                  alarmId: currentAlarm.id,
                  settings: currentAlarm.mission ? JSON.stringify(currentAlarm.mission.settings) : null
                });
                
                router.replace({
                  pathname: '/final-cookiejam',
                  params: { 
                    alarmId: currentAlarm.id,
                    settings: currentAlarm.mission ? JSON.stringify(currentAlarm.mission.settings) : null
                  }
                });
              })
              .catch(error => {
                console.error('Error starting Cookie Jam mission:', error);
                hasMissionStarted.current = false;
              });
            break;
            
          case 'wordle':
            console.log('Starting Wordle mission');
            // Use Promise chain instead of await
            AsyncStorage.setItem('missionInProgress', 'true')
              .then(() => {
                // Set the current alarm ID for the mission
                if (currentAlarm.id) {
                  return AsyncStorage.setItem('currentAlarmId', currentAlarm.id);
                }
                return Promise.resolve();
              })
              .then(() => {
                // Navigate to the final-wordle screen
                router.replace({
                  pathname: '/final-wordle',
                  params: {
                    alarmId: currentAlarm.id,
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
              })
              .catch(error => {
                console.error('Error starting Wordle mission:', error);
                hasMissionStarted.current = false;
              });
            break;
            
          case 'tetris':
            console.log('Starting Tetris mission');
            // Use Promise chain instead of await
            AsyncStorage.setItem('missionInProgress', 'true')
              .then(() => {
                // Set the current alarm ID for the mission
                if (currentAlarm.id) {
                  return AsyncStorage.setItem('currentAlarmId', currentAlarm.id);
                }
                return Promise.resolve();
              })
              .then(() => {
                // Navigate to the Tetris game
                router.replace({
                  pathname: '/final-tetris',
                  params: {
                    alarmId: currentAlarm.id,
                    sound: currentAlarm.sound,
                    soundVolume: currentAlarm.soundVolume?.toString() || '1'
                  }
                });
              })
              .catch(error => {
                console.error('Error starting Tetris mission:', error);
                hasMissionStarted.current = false;
              });
            break;
            
          case 'Steps':
          case 'steps':
            console.log('Starting Steps mission');
            // Use Promise chain instead of await
            AsyncStorage.setItem('missionInProgress', 'true')
              .then(() => {
                // Set the current alarm ID for the mission
                if (currentAlarm.id) {
                  return AsyncStorage.setItem('currentAlarmId', currentAlarm.id);
                }
                return Promise.resolve();
              })
              .then(() => {
                // Navigate to the Steps game
                console.log('Navigating to step counter with params:', { 
                  alarmId: currentAlarm.id,
                  settings: currentAlarm.mission ? JSON.stringify(currentAlarm.mission.settings) : null
                });
                
                router.replace({
                  pathname: '/final-step-counter',
                  params: { 
                    alarmId: currentAlarm.id,
                    settings: currentAlarm.mission ? JSON.stringify(currentAlarm.mission.settings) : null
                  }
                });
              })
              .catch(error => {
                console.error('Error starting Steps mission:', error);
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