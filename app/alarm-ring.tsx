import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Vibration, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { scheduleAlarmNotification, stopAlarmSound, cancelAllNotifications, resetAlarmState, playAlarmSound } from './notifications';
import * as Notifications from 'expo-notifications';
import soundAssets from './sounds';
import AlarmSoundModule from './native-modules/AlarmSoundModule';
import SystemVolumeModule from './native-modules/SystemVolumeModule';
// import { saveWakeupToFirestore, getCurrentUser } from './config/firebase';


// Add this type definition at the top of your file
interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
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

// Update the recordWakeupTime function to ALSO save to Firebase:
const recordWakeupTime = async (alarmId: string, currentAlarm?: Alarm | null) => {
  try {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    const hours = today.getHours();
    const minutes = today.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // 🚫 SKIP: Don't record late night dismissals (00:00 - 02:00)
    if (hours >= 0 && hours < 2) {
      console.log('⏰ Skipping late night alarm dismissal (00:00-02:00)');
      return;
    }
    
    console.log(`Recording wake-up time: ${dateString} at ${timeString} for alarm ${alarmId}`);
    
    // 📱 Save to local storage (same as before, but with time filter)
    const historyJson = await AsyncStorage.getItem('wakeupHistory');
    const history = historyJson ? JSON.parse(historyJson) : {};
    
    // Keep earliest time per day logic
    if (history[dateString]) {
      const [existingHours, existingMinutes] = history[dateString].time.split(':').map(Number);
      const existingTimeMinutes = existingHours * 60 + existingMinutes;
      const currentTimeMinutes = hours * 60 + parseInt(minutes);
      
      if (currentTimeMinutes < existingTimeMinutes) {
        history[dateString] = { time: timeString, alarmId: alarmId };
        console.log('Updated with earlier wake-up time');
      } else {
        console.log('Keeping existing earlier wake-up time');
        return;
      }
    } else {
      history[dateString] = { time: timeString, alarmId: alarmId };
    }
    
    await AsyncStorage.setItem('wakeupHistory', JSON.stringify(history));
    console.log('Successfully recorded wake-up time');
  } catch (error) {
    console.error('Error recording wake-up time:', error);
  }
};

// 💾 SAVE: New function to actually save the wake-up
const saveWakeUpRecord = async (alarmId: string, currentAlarm: Alarm | null, timeString: string, dateString: string) => {
  try {
    // ✅ ALWAYS save to Firebase
    // const user = getCurrentUser();
    // if (user) {
    //   try {
    //     await saveWakeupToFirestore({
    //       wakeUpTime: timeString,
    //       actualTime: timeString,
    //       targetTime: currentAlarm?.time || timeString,
    //       date: dateString,
    //       message: `Woke up at ${timeString}! 🌅`,
    //       soundUsed: currentAlarm?.sound || 'Unknown',
    //       alarmId: alarmId
    //     });
    //     console.log('✅ Wake-up saved to Firebase!');
    //   } catch (firebaseError) {
    //     console.error('❌ Failed to save to Firebase:', firebaseError);
    //   }
    // }

    // ✅ Save to local storage for calendar (earliest only)
    const historyJson = await AsyncStorage.getItem('wakeupHistory');
    const history = historyJson ? JSON.parse(historyJson) : {};
    
    if (history[dateString]) {
      const [existingHours, existingMinutes] = history[dateString].time.split(':').map(Number);
      const existingTimeMinutes = existingHours * 60 + existingMinutes;
      const [currentHours, currentMinutes] = timeString.split(':').map(Number);
      const currentTimeMinutes = currentHours * 60 + currentMinutes;
      
      if (currentTimeMinutes < existingTimeMinutes) {
        history[dateString] = { time: timeString, alarmId: alarmId };
        console.log('Updated with earlier wake-up time');
      } else {
        console.log('Keeping existing earlier wake-up time for calendar');
      }
    } else {
      history[dateString] = { time: timeString, alarmId: alarmId };
    }
    
    await AsyncStorage.setItem('wakeupHistory', JSON.stringify(history));
    console.log('Successfully recorded wake-up time');
  } catch (error) {
    console.error('Error saving wake-up record:', error);
  }
};

// Add this function to alarm-ring.tsx (around line 140)
const disableAlarm = async (alarmId: string) => {
  try {
    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (alarmsJson) {
      const alarms = JSON.parse(alarmsJson);
      const updatedAlarms = alarms.map((alarm: any) => {
        if (alarm.id === alarmId) {
          return { ...alarm, enabled: false };
        }
        return alarm;
      });
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      console.log(`Alarm ${alarmId} disabled after successful mission`);
    }
  } catch (error) {
    console.error('Error disabling alarm:', error);
  }
};

// Add these new functions after the disableAlarm function (around line 150)
const setCurrentPlayingAlarm = async (alarmId: string) => {
  await AsyncStorage.setItem('currentPlayingAlarm', alarmId);
};

const getCurrentPlayingAlarm = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('currentPlayingAlarm');
};

const clearCurrentPlayingAlarm = async () => {
  await AsyncStorage.removeItem('currentPlayingAlarm');
};

// Add this function to manually restore volume
const restoreSystemVolume = async () => {
  try {
    // Get the original volume before the alarm started
    const originalVolume = await AsyncStorage.getItem('originalSystemVolume');
    if (originalVolume) {
      // Use SystemVolumeModule instead of AlarmSoundModule
      await SystemVolumeModule.restoreOriginalVolume();
      console.log('Attempted to restore original volume:', originalVolume);
    }
  } catch (error) {
    console.error('Error restoring volume:', error);
  }
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const snoozeTimeout = useRef<NodeJS.Timeout | null>(null);
  let soundInstance: Audio.Sound | null = null;

  // Add these state variables at the component level
  const [soundName, setSoundName] = useState((params.sound as string) || 'beacon');
  const [volume, setVolume] = useState(Number(params.soundVolume) || 1);

  console.log('AlarmRingScreen params:', params);

  // Update the useEffect that runs when the component mounts
  useEffect(() => {
    console.log('AlarmRingScreen mounted');
    
    // Check if returning from a failed mission
    if (params.missionFailed === 'true') {
      console.log('Returning from failed mission');
      setMissionFailed(true);
      
      // Make sure hasMission is also set to true when returning from a failed mission
      setHasMission(true);
    }
    
    // Set flag that alarm screen is showing (for notification handling)
    AsyncStorage.setItem('alarmScreenShowing', 'true');
    
    // Start vibration
    if (params.vibration !== 'false') {
      startVibration();
    }
    
    // Cancel only alarm notifications when alarm screen is opened to prevent duplicates
    console.log('Cancelling only alarm notifications when alarm screen opened');
    Notifications.getAllScheduledNotificationsAsync().then(notifications => {
      notifications.forEach(notification => {
        const data = notification.content.data as any;
        const isSleepReminder = 
          notification.identifier === "SleepReminder" || 
          (data && data.notificationType === "sleepReminder");
        
        if (!isSleepReminder) {
          Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      });
    }).catch(error => {
      console.error('Error filtering notifications:', error);
    });
    
    // Load alarm data
    if (loadAlarmRef.current) {
      // Small delay to prevent race conditions
      setTimeout(() => {
        loadAlarmRef.current && loadAlarmRef.current();
      }, 100);
    }
    
    return () => {
      // Clean up on unmount
      stopVibration();
      // Reset alarm screen flag
      AsyncStorage.setItem('alarmScreenShowing', 'false');
    };
  }, []);

  // Add this new useEffect to handle app state changes
  useEffect(() => {
    // Enhance the Audio setup to better handle silent mode
    const setupAudio = async () => {
      try {
        // Configure audio to be as prominent as possible
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // DO_NOT_MIX
          playsInSilentModeIOS: true, // This is essential
        });
        
        // Add this code to set up audio session for alarms
        if (sound) {
          await sound.setVolumeAsync(1.0); // Maximum volume
          
          // Set additional options before playing
          await sound.setProgressUpdateIntervalAsync(1000);
          await sound.setPositionAsync(0);
          
          // Now play the sound without parameters
          await sound.playAsync();
        }
        
        console.log('Audio configured to play in background');
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
    
    setupAudio();
  }, [sound]);

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
        
        // Use a default sound if none specified
        const soundName = params.sound as string || 'beacon';
        const volume = Number(params.soundVolume) || 1;
        
        console.log('Using sound:', soundName, 'at volume:', volume);
        
        // Start vibration pattern if enabled
        startVibration();
        
        // Let the native module handle all audio configuration
        console.log('Using native module for alarm audio');
        
        // Use the native module directly
        if (Platform.OS === 'ios') {
          console.log('Using AlarmSoundModule to play:', soundName, 'at volume', volume);
          AlarmSoundModule.playAlarmSound(soundName, volume)
            .catch((error: Error) => {
              console.error('Error with AlarmSoundModule playback:', error);
              // Fall back to vibration only
            });
        }
      } catch (error) {
        console.error('Error loading and playing alarm sound:', error);
        
        // Show error state in the UI
        setErrorMessage('Failed to play alarm sound');
        // Try to fallback to system sound if we fail
        Vibration.vibrate([500, 500], true);
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
      if (sound) {
        console.log('Cleaning up sound in useEffect');
        try {
          // Check if the sound is loaded before trying to stop it
          sound.getStatusAsync().then((status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              if (status.isLoaded && sound) {
                sound.stopAsync().then(() => {
                  if (sound) {
                    sound.unloadAsync().catch(() => {});
                  }
                }).catch(() => {});
              }
            }
          }).catch(() => {
            // If we can't get the status, just try to unload directly
            if (sound) {
              sound.unloadAsync().catch(() => {});
            }
          });
        } catch (e) {
          console.log('Error during sound cleanup (non-critical):', e);
        }
      }
    };
  }, []);

  // Update the useEffect that handles sound playback (around line 507)
  useEffect(() => {
    console.log('Sound management useEffect running');
    
    const playSound = async () => {
      try {
        if (Platform.OS === 'ios') {
          console.log('Playing sound with AlarmSoundModule:', soundName, volume);
          await AlarmSoundModule.playAlarmSound(soundName, volume);
          
          // Mark this alarm as currently playing (for ALL alarms, not just ones with missions)
          if (params.alarmId) {
            await setCurrentPlayingAlarm(params.alarmId as string);
          }
          
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Failed to play alarm sound:', error);
      }
    };

    // Play sound for ALL alarms (not just ones with currentAlarm set)
    if (params.alarmId) {
      playSound();
    }
    
    return () => {
      console.log('Sound management useEffect cleanup');
      // Don't stop sound in cleanup - let stopSound() handle it properly
    };
  }, [soundName, volume, params.alarmId]);

  // Update the stopSound function to call this:
  const stopSound = async () => {
    try {
      console.log('Stopping alarm sound for alarm:', currentAlarm?.id || params.alarmId);
      
      // Get the alarm ID from either currentAlarm or params
      const alarmId = currentAlarm?.id || (params.alarmId as string);
      
      // Check if this alarm is the one currently playing sound
      const currentPlayingAlarmId = await getCurrentPlayingAlarm();
      
      if (currentPlayingAlarmId === alarmId) {
        console.log('This alarm is currently playing, stopping global sound');
        
        // FIXED: Single call to stop alarm sound - let Swift handle volume restoration
        await AlarmSoundModule.stopAlarmSound();
        
        // Clear the currently playing alarm
        await clearCurrentPlayingAlarm();
      } else {
        console.log('This alarm is not currently playing sound, skipping global sound stop');
      }
      
      // FIXED: Disable the alarm when stopping sound (mission completed)
      if (alarmId) {
        await disableAlarm(alarmId);
      }
      
      // Stop vibration (only for this alarm)
      stopVibration();
      
      // Record wake-up time
      if (currentAlarm) {
        await recordWakeupTime(currentAlarm.id, currentAlarm);
      }
      
      // Clear the active alarm if it matches this alarm
      const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
      if (activeAlarmJson) {
        const activeAlarm = JSON.parse(activeAlarmJson);
        if (activeAlarm.alarmId === alarmId) {
          await AsyncStorage.removeItem('activeAlarm');
        }
      }
      
      // Reset alarm state
      await resetAlarmState();
      
      // Navigate back to the alarms screen
      router.replace('/alarm-success');
    } catch (error) {
      console.error('Error stopping alarm sound:', error);
      
      // Fallback: try to navigate away even if there was an error
      router.replace('/(tabs)');
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
      // Stop the alarm sound immediately when mission starts
      await stopSound();
      
      // Then continue with mission logic...
      // Navigate to mission screen, etc.
      
      // Stop vibration
      stopVibration();
      
      // Make sure sound is stopped before starting mission
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.stopAsync();
          }
        } catch (e) {
          console.log('Error stopping sound when starting mission:', e);
        }
      }
      
      hasMissionStarted.current = true;
      
      // Navigate to the appropriate mission screen
      if (currentAlarm?.mission) {
        const mission = typeof currentAlarm.mission === 'string' 
          ? currentAlarm.mission 
          : currentAlarm.mission.name;
        
        console.log('Starting mission:', mission);
        
        // Different navigation based on mission type
        const missionLower = mission.toLowerCase();
        
        console.log('Mission type (lowercase):', missionLower);
        
        switch (missionLower) {
          case 'tetris':
            router.replace('/final-tetris');
            break;
          case 'math':
            router.replace('/final-math');
            break;
          case 'typing':
            router.replace('/final-typing');
            break;
          case 'qr':
          case 'qr/barcode': 
            router.replace('/final-qr');
            break;
          case 'wordle':
            router.replace('/final-wordle');
            break;
          case 'cookiejam':
            router.replace('/final-cookiejam');
            break;
          case 'bliss alarm card':
          case 'blisscard':
            router.replace('/final-card');
            break;
          default:
            console.warn('Unknown mission type:', mission);
            router.replace('/final-math');
        }
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
    } else if (missionName === 'bliss alarm card' || missionType === 'blisscard') {
      return 'Bliss Card';
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

  // Call this function in your dismissAlarm function
  const handleDismiss = async () => {
    try {
      // Record wake-up time when alarm is dismissed
      if (currentAlarm) {
        await recordWakeupTime(currentAlarm.id, currentAlarm);
      }
      
      // Rest of your existing code...
    } catch (error) {
      console.error('Error dismissing alarm:', error);
    }
  };

  // Add this function to handle mission completion
  const handleMissionComplete = async () => {
    try {
      console.log('Mission completed, restoring volume');
      
      // Make multiple attempts to restore volume
      await AlarmSoundModule.stopAlarmSound();
      
      // Add additional attempts with delays
      setTimeout(() => AlarmSoundModule.stopAlarmSound(), 500);
      setTimeout(() => AlarmSoundModule.stopAlarmSound(), 1500);
      
      // Continue with normal mission completion logic
      // ...
      
      // Navigate back to the alarms tab
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error handling mission completion:', error);
      router.replace('/(tabs)');
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
                    onPress={stopSound}
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
                    onPress={stopSound}
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