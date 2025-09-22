import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Link, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Switch } from 'react-native';
import { scheduleAlarmNotification, cancelAlarmNotification } from './notifications';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';

// Add this at the top of your file, after imports
declare global {
  var alarmTimers: {
    [key: string]: NodeJS.Timeout;
  }; 
}

interface Mission {
  id: string;
  name: string;
  icon: string;
}

interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
  label: string;
  sound: string;
  soundVolume: number;
  vibration: boolean;
  mission: Mission | null;
  notificationId: string | null;
  snooze: {
    enabled: boolean;
    maxSnoozes: number;
    interval: number;
  };
  wallpaper: string; // Added wallpaper property
}

// Silent background audio instance to keep audio session active
let backgroundAudioInstance: Audio.Sound | null = null;

// Function to activate silent background audio loop
const activateBackgroundAudio = async () => {
  try {
    // Clean up any existing audio
    if (backgroundAudioInstance) {
      await backgroundAudioInstance.unloadAsync();
    }
    
    // Configure audio session for background
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 2, // DuckOthers - ensures alarm can be heard
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1, // DoNotMix
    });
    
    // Create silent looping audio (using a built-in sound for simplicity)
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/silence.caf'), // Make sure this file exists!
      { 
        volume: 0.0, // Completely silent
        isLooping: true,
      }
    );
    
    await sound.playAsync();
    backgroundAudioInstance = sound;
    
    console.log('✅ Silent background audio activated to support alarms in silent mode');
  } catch (error) {
    console.error('❌ Failed to activate background audio:', error);
  }
};

// Update the scheduleAlarmRingScreen function to respect selected days
const scheduleAlarmRingScreen = (alarm: {
  id: string;
  time: string;
  sound: string;
  soundVolume: number;
  mission?: any;
  wallpaper: string; // Added wallpaper to the type
}) => {
  try {
    // Parse the time
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, set it for tomorrow
    // (only if we're still scheduling for today)
    const now = new Date();
    if (alarmTime < now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    console.log(`Scheduling alarm-ring screen for: ${alarmTime.toLocaleString()}`);
    
    // Calculate milliseconds until alarm time
    const msUntilAlarm = alarmTime.getTime() - now.getTime();
    
    // Schedule a timer to open the alarm-ring screen at the exact time
    const timerId = setTimeout(() => {
      // When the timer fires, set the active alarm and navigate
      AsyncStorage.setItem('activeAlarm', JSON.stringify({
        alarmId: alarm.id,
        timestamp: new Date().getTime(),
        sound: alarm.sound,
        soundVolume: alarm.soundVolume,
        hasMission: Boolean(alarm.mission),
        wallpaper: alarm.wallpaper // Save wallpaper
      })).then(() => {
        // Navigate to the alarm-ring screen
        router.replace({
          pathname: '/alarm-ring',
          params: {
            alarmId: alarm.id,
            sound: alarm.sound,
            soundVolume: alarm.soundVolume.toString(),
            hasMission: Boolean(alarm.mission).toString(),
            wallpaper: alarm.wallpaper // Pass wallpaper to alarm-ring
          }
        });
      });
    }, msUntilAlarm);
    
    // Store the timer ID in a global object so we can clear it if needed
    if (!global.alarmTimers) {
      global.alarmTimers = {};
    }
    global.alarmTimers[alarm.id] = timerId;
    
    console.log(`Scheduled alarm-ring screen for alarm: ${alarm.id} at ${alarmTime.toLocaleString()}`);
    
    return timerId;
  } catch (error) {
    console.error('Error scheduling alarm-ring screen:', error);
    return null;
  }
};

export default function NewAlarmScreen() {
  const params = useLocalSearchParams();
  console.log('NewAlarm: Initial params:', params);

  // Keep edit state and ID persistent throughout component lifecycle
  const [isEditing, setIsEditing] = useState(() => {
    const editMode = params.editMode === 'true';
    console.log('NewAlarm: Setting initial edit mode:', editMode);
    return editMode;
  });
  
  const [currentAlarmId, setCurrentAlarmId] = useState(() => {
    const id = params.alarmId as string;
    console.log('NewAlarm: Setting initial alarmId:', id);
    return id;
  });

  const [date, setDate] = useState(() => {
    if (params.time) {
      const [hours, minutes] = (params.time as string).split(':');
      const d = new Date();
      d.setHours(parseInt(hours), parseInt(minutes));
      return d;
    }
    return new Date();
  });
  const [selectedMission, setSelectedMission] = useState('gmmmmmm');
  const [volume, setVolume] = useState(0.5);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [sound, setSound] = useState('Orkney');
  const [missionIcon, setMissionIcon] = useState('calculator');
  const [missionColor, setMissionColor] = useState('#4CAF50');
  const [label, setLabel] = useState<string>('');
  const [soundVolume, setSoundVolume] = useState(1);
  const [mission, setMission] = useState<Mission | null>(null);
  const [missionType, setMissionType] = useState<string | null>(null);
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [maxSnoozes, setMaxSnoozes] = useState(3);
  const [snoozeInterval, setSnoozeInterval] = useState(5); // in minutes
  const [missionSettings, setMissionSettings] = useState<any>({});
  const [isUnlimitedSnoozes, setIsUnlimitedSnoozes] = useState(false);
  const [hasMission, setHasMission] = useState(false);
  const [missionName, setMissionName] = useState('');
  const [missionEmoji, setMissionEmoji] = useState('');
  const [wallpaper, setWallpaper] = useState('sleepy'); // Added wallpaper state

  const calculateRingTime = () => {
    const now = new Date();
    const alarmTime = new Date(date);
    const timeDiff = alarmTime.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `Ring in ${hours}hrs ${minutes}min`;
  };

  // Save state before navigation
  const saveState = async () => {
    const state = {
      alarmId: currentAlarmId,
      editMode: isEditing,  // Add edit mode to saved state
      mission: missionType,
      wallpaper: wallpaper // Save wallpaper
    };
    await AsyncStorage.setItem('tempAlarmState', JSON.stringify(state));
  };

  // Load state after navigation
  useEffect(() => {
    const loadSavedState = async () => {
      const savedState = await AsyncStorage.getItem('tempAlarmState');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.editMode) {
          console.log('NewAlarm: Restoring edit mode:', state.editMode);
          setIsEditing(true);
          setCurrentAlarmId(state.alarmId);
        }
        if (state.wallpaper) { // Load wallpaper
          setWallpaper(state.wallpaper);
        }
      }
    };
    loadSavedState();
  }, []);

  // Navigate to mission selector while preserving edit state
  const navigateToMissionSelector = async () => {
    await saveState();
    router.push({
      pathname: '/missionselector',
      params: {
        editMode: isEditing.toString(),
        alarmId: currentAlarmId,
        returnTo: 'new-alarm'
      }
    });
  };

  // Update the edit state when params change
  useEffect(() => {
    console.log('NewAlarm: Params received:', params);
    if (params.editMode === 'true') {
      console.log('NewAlarm: Edit mode:', true);
    }
    if (params.wallpaper) { // Update wallpaper from params
      setWallpaper(params.wallpaper as string);
    }
  }, [params]);

  const handleSave = async () => {
    try {
      console.log('NewAlarm: Starting save process');
      console.log('NewAlarm: isEditing:', isEditing, 'currentAlarmId:', currentAlarmId);
      console.log('NewAlarm: missionType:', missionType);
      
      const alarmsJson = await AsyncStorage.getItem('alarms');
      let alarms = alarmsJson ? JSON.parse(alarmsJson) : [];

      // Cancel existing notification if editing
      if (isEditing && currentAlarmId) {
        const existingAlarm = alarms.find((alarm: Alarm) => alarm.id === currentAlarmId);
        if (existingAlarm?.notificationId) {
          await cancelAlarmNotification(existingAlarm.notificationId);
        }
      }

      // Handle mission settings based on mission type
      let missionSettings = null;
      
      if (missionType === 'Math') {
        missionSettings = {
          type: 'Math',
          difficulty: 'medium'
        };
      } else if (missionType === 'Typing') {
        missionSettings = {
          type: 'Typing',
          phrase: 'The quick brown fox jumps over the lazy dog',
          timeLimit: 30,
          caseSensitive: false
        };
      } else if (missionType === 'Photo') {
        // For Photo missions, get the stored photo path from AsyncStorage
        try {
          let photoPath = null;
          
          // Get saved photo URI
          const photoData = await AsyncStorage.getItem('photoMissionData');
          console.log("NewAlarm - photoMissionData from storage:", photoData);
          
          if (photoData) {
            try {
              const parsedData = JSON.parse(photoData);
              photoPath = parsedData.photo;
              console.log('NewAlarm - Found photo in photoMissionData:', photoPath);
            } catch (error) {
              console.error('NewAlarm - Error parsing photoMissionData:', error);
            }
          }
          
          // Create photo mission settings
          missionSettings = {
            type: 'Photo',
            photo: photoPath
          };
          
          console.log('NewAlarm - Final Photo mission settings:', missionSettings);
          
          // Save this photo URI to a separate key that final-photo can use
          if (photoPath) {
            await AsyncStorage.setItem('currentPhotoMission', photoPath);
            console.log('NewAlarm - Saved photo to currentPhotoMission:', photoPath);
          }
        } catch (error) {
          console.error('NewAlarm - Error setting up photo mission:', error);
          missionSettings = {
            type: 'Photo',
            photo: null
          };
        }
      } else if (missionType === 'QR') {
        missionSettings = {
          type: 'QR'
        };
      } else if (missionType === 'Wordle') {
        missionSettings = {
          type: 'Wordle',
          difficulty: 'medium',
          times: 1,
          timeLimit: 300
        };
      }

      // Create mission object if a mission type is selected
      let missionObject = null;
      if (missionType && missionType !== 'null' && missionType !== 'undefined') {
        // Create a new mission object
        missionObject = {
          id: `mission_${Date.now()}`,
          name: missionType,
          icon: getMissionIcon(missionType),
          settings: missionSettings || null
        };
        
        console.log('NewAlarm: Created mission object:', missionObject);
      } else {
        console.log('NewAlarm: No mission type selected, mission will be null');
      }

      console.log('NewAlarm: Final mission object:', missionObject);

      // Schedule notification first
      const notificationId = await scheduleAlarmNotification({
        id: isEditing ? currentAlarmId : `alarm_${Date.now()}`,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        mission: missionObject,
        sound: sound,
        soundVolume: soundVolume
      });

      console.log('NewAlarm: Notification scheduled with ID:', notificationId);

      // Normalize sound name to lowercase for consistency
      const normalizedSound = sound.toLowerCase();

      // When creating the new alarm object, ensure mission is properly set
      const newAlarm: Alarm = {
        id: isEditing ? currentAlarmId : `alarm_${Date.now()}`,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        enabled: true,
        label: label || '',
        mission: missionObject,
        sound: normalizedSound,
        soundVolume: soundVolume,
        vibration: vibrationEnabled,
        wallpaper: wallpaper, // Add wallpaper to new alarm
        notificationId: notificationId || null,
        snooze: {
          enabled: snoozeEnabled,
          maxSnoozes: maxSnoozes,
          interval: snoozeInterval
        }
      } as Alarm;

      if (isEditing && currentAlarmId) {
        console.log('NewAlarm: Updating existing alarm:', currentAlarmId);
        alarms = alarms.map((alarm: Alarm) => 
          alarm.id === currentAlarmId ? newAlarm : alarm
        );
        if (!alarms.some((alarm: Alarm) => alarm.id === currentAlarmId)) {
          console.log('NewAlarm: Alarm not found, adding as new');
          alarms.push(newAlarm);
        }
      } else {
        console.log('NewAlarm: Creating new alarm');
        alarms.push(newAlarm);
      }

      console.log('NewAlarm: Final alarms array:', alarms);
      await AsyncStorage.setItem('alarms', JSON.stringify(alarms));
      
      // Clear temp state after successful save
      await AsyncStorage.removeItem('tempAlarmState');
      
      // Also schedule the alarm-ring screen
      scheduleAlarmRingScreen(newAlarm);
      
      // Activate silent background audio if alarm is enabled
      if (Platform.OS === 'ios') {
        activateBackgroundAudio();
      }
      
      router.push('/');
    } catch (error) {
      console.error('NewAlarm: Error saving alarm:', error);
    }
  };

  useEffect(() => {
    if (params.missionIcon) setMissionIcon(params.missionIcon as string);
    if (params.missionColor) setMissionColor(params.missionColor as string);
  }, [params]);

  useEffect(() => {
    if (params.currentLabel) {
      setLabel(params.currentLabel as string);
    }
  }, [params.currentLabel]);

  useEffect(() => {
    if (params.selectedSound) {
      setSound(params.selectedSound as string);
    }
  }, [params.selectedSound]);

  useEffect(() => {
    const loadAlarm = async () => {
      if (params.alarmId) {
        const alarmId = params.alarmId as string;
        console.log('Loading existing alarm:', alarmId);
        
        try {
          const existingAlarms = await AsyncStorage.getItem('alarms');
          if (existingAlarms) {
            const alarms = JSON.parse(existingAlarms);
            const currentAlarm = alarms.find((a: any) => a.id === alarmId);
            
            if (currentAlarm) {
              console.log('Found current alarm:', currentAlarm);
              
              // Set time from the alarm's time string
              if (currentAlarm.time) {
                const [hours, minutes] = currentAlarm.time.split(':');
                const newDate = new Date();
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                setDate(newDate);
              }
              
              // Handle mission data
              if (currentAlarm.mission) {
                setHasMission(true);
                if (typeof currentAlarm.mission === 'object') {
                  setMission(currentAlarm.mission);
                  setMissionType(currentAlarm.mission.name || '');
                } else {
                  // Create a complete Mission object with all required properties
                  setMission({ 
                    id: `mission_${Date.now()}`, 
                    name: currentAlarm.mission,
                    icon: getMissionIcon(currentAlarm.mission)
                  });
                  setMissionType(currentAlarm.mission);
                }
              } else {
                setHasMission(false);
                setMission(null);
                setMissionType('');
              }
              
              // Handle sound settings
              setSound(currentAlarm.sound || 'Beacon');
              setSoundVolume(typeof currentAlarm.soundVolume === 'number' ? currentAlarm.soundVolume : 1);
              
              // Handle vibration
              setVibrationEnabled(currentAlarm.vibration !== false);
              
              // Handle snooze settings if they exist
              if (currentAlarm.snooze) {
                setSnoozeEnabled(currentAlarm.snooze.enabled !== false);
                setSnoozeInterval(currentAlarm.snooze.interval || 5);
                setMaxSnoozes(currentAlarm.snooze.maxSnoozes || 3);
              }
              if (currentAlarm.wallpaper) { // Load wallpaper from existing alarm
                setWallpaper(currentAlarm.wallpaper);
              }
            } else {
              console.log('Alarm not found with ID:', alarmId);
            }
          }
        } catch (error) {
          console.error('Error loading alarm:', error);
        }
      }
    };

    loadAlarm();
  }, [params.alarmId]);

  useEffect(() => {
    console.log('Mission params:', {
      selectedMissionId: params.selectedMissionId,
      selectedMissionName: params.selectedMissionName,
      selectedMissionIcon: params.selectedMissionIcon
    });

    if (params.selectedMissionId && params.editMode === 'true') {  // Check if we're editing
      const newMission: Mission = {
        id: params.selectedMissionId as string,
        name: params.selectedMissionName as string,
        icon: params.selectedMissionIcon as string
      };
      console.log('Setting new mission for edit:', newMission);
      setMission(newMission);
      setHasMission(true);
    }
  }, [params.selectedMissionId, params.editMode]);  // Add editMode to dependencies

  const saveAlarmState = async (currentState: any) => {
    await AsyncStorage.setItem('tempAlarmState', JSON.stringify(currentState));
  };

  const loadAlarmState = async () => {
    const savedState = await AsyncStorage.getItem('tempAlarmState');
    if (savedState) {
      const state = JSON.parse(savedState);
      setLabel(state.label || '');
      setSound(state.sound || 'Orkney');
      if (state.date) {
        setDate(new Date(state.date));
      }
      if (state.wallpaper) { // Load wallpaper from saved state
        setWallpaper(state.wallpaper);
      }
    }
  };

  const navigateWithState = async (pathname: string) => {
    const currentState = {
      label,
      sound,
      date: date.toISOString(),
      wallpaper: wallpaper // Save wallpaper with state
    };
    await saveAlarmState(currentState);
    router.push({ pathname } as any);
  };

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        // Load label first
        const savedLabel = await AsyncStorage.getItem('tempLabel');
        if (savedLabel) {
          setLabel(savedLabel);
        }

        // Load mission separately
        const savedMission = await AsyncStorage.getItem('tempMission');
        if (savedMission) {
          setMission(JSON.parse(savedMission));
        }

        // Load other state
        const savedState = await AsyncStorage.getItem('tempAlarmState');
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.date) setDate(new Date(state.date));
          if (state.wallpaper) setWallpaper(state.wallpaper); // Load wallpaper from saved state
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };

    loadSavedState();
  }, []);

  // Listen for changes to the label when returning from label screen
  useEffect(() => {
    const loadAlarms = async () => {
      try {
        const existingAlarms = await AsyncStorage.getItem('alarms');
        if (existingAlarms) {
          const alarms = JSON.parse(existingAlarms);
          const currentAlarm = alarms.find((alarm: any) => alarm.id === params.alarmId);
          if (currentAlarm) {
            setLabel(currentAlarm.label || '');
            if (currentAlarm.wallpaper) { // Load wallpaper from current alarm
              setWallpaper(currentAlarm.wallpaper);
            }
          }
        }
      } catch (error) {
        console.error('Error loading alarm label:', error);
      }
    };

    loadAlarms();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadMissionType = async () => {
        try {
          const savedType = await AsyncStorage.getItem('selectedMissionType');
          console.log('New Alarm - Loading mission type:', savedType);
          
          if (savedType) {
            setMissionType(savedType);
            console.log('New Alarm - Set mission type to:', savedType);
          }
        } catch (error) {
          console.error('Error loading mission type:', error);
        }
      };

      loadMissionType();
    }, [])
  );

  const getMissionEmoji = (missionType: string): string => {
    const missionEmojis: Record<string, string> = {
      'Math': '🔢',
      'Typing': '⌨️',
      'Wordle': '🎲',
      'QR/Barcode': '📱',
      'Tetris': '🎮',
      'Cookie Jam': '🍪'
    };
    
    // Check if we have a direct match
    if (missionEmojis[missionType]) {
      return missionEmojis[missionType];
    }
    
    // Try case-insensitive match
    const lowerCaseMissionType = missionType.toLowerCase();
    for (const [key, emoji] of Object.entries(missionEmojis)) {
      if (key.toLowerCase() === lowerCaseMissionType) {
        return emoji;
      }
    }
    
    // Special case for Cookie Jam
    if (lowerCaseMissionType.includes('cookie') || lowerCaseMissionType.includes('jam')) {
      return '🍪';
    }
    
    // Default to bell emoji if no match
    return '🔔';
  };

  // Add this effect to load snooze settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snoozeSettingsJson = await AsyncStorage.getItem('snoozeSettings');
        if (snoozeSettingsJson) {
          const settings = JSON.parse(snoozeSettingsJson);
          setSnoozeEnabled(settings.enabled ?? true);
          setSnoozeInterval(settings.interval ?? 5);
          setMaxSnoozes(settings.max ?? 3);
          setIsUnlimitedSnoozes(settings.unlimited ?? false);
        }
      } catch (error) {
        console.error('Error loading snooze settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Add useFocusEffect to reload settings when returning from snooze screen
  useFocusEffect(
    React.useCallback(() => {
      const loadSnoozeSettings = async () => {
        try {
          const settings = await AsyncStorage.getItem('snoozeSettings');
          if (settings) {
            const { enabled, max, interval } = JSON.parse(settings);
            setSnoozeEnabled(enabled);
            setMaxSnoozes(max);
            setSnoozeInterval(interval);
            setIsUnlimitedSnoozes(max === 0);
          }
        } catch (error) {
          console.error('Error loading snooze settings:', error);
        }
      };
      loadSnoozeSettings();
    }, [])
  );

  useEffect(() => {
    const checkMissionData = async () => {
      const missionType = await AsyncStorage.getItem('selectedMissionType');
      const missionSettings = await AsyncStorage.getItem('selectedMissionSettings');
      
      console.log('DEBUG - Selected mission type:', missionType);
      console.log('DEBUG - Selected mission settings:', missionSettings);
      
      if (missionType === 'Typing' && missionSettings) {
        const settings = JSON.parse(missionSettings);
        console.log('DEBUG - Typing phrase:', settings.phrase);
        setMissionType('Typing');
      }
    };
    
    checkMissionData();
  }, []);

  // Make saveMission an async function to retrieve photo data
  const saveMission = async () => {
    console.log('DEBUG - Selected mission type:', selectedMission);
    
    // Prepare mission settings based on type
    let missionSettings = {};
    
    if (selectedMission === 'Math') {
      missionSettings = {
        type: 'Math',
        difficulty: 'medium'
      };
    } else if (selectedMission === 'Typing') {
      missionSettings = {
        type: 'Typing',
        phrase: 'The quick brown fox jumps over the lazy dog',
        timeLimit: 30,
        caseSensitive: false
      };
    } else if (selectedMission === 'Photo') {
      // For Photo missions, get the stored photo path from AsyncStorage
      try {
        // Try to retrieve photo data from multiple possible storage keys
        let photoPath = null;
        
        // First try selectedAlarmPhoto
        const selectedPhoto = await AsyncStorage.getItem('selectedAlarmPhoto');
        if (selectedPhoto) {
          photoPath = selectedPhoto;
          console.log('Found photo path in selectedAlarmPhoto:', photoPath);
        }
        
        // Then try photoMissionData if selectedAlarmPhoto was empty
        if (!photoPath) {
          const photoData = await AsyncStorage.getItem('photoMissionData');
          if (photoData) {
            const parsedData = JSON.parse(photoData);
            photoPath = parsedData.photo;
            console.log('Found photo path in photoMissionData:', photoPath);
          }
        }
        
        // Create proper Photo mission settings
        missionSettings = {
          type: 'Photo', // Explicit Photo type
          photo: photoPath // Use the retrieved photo path
        };
        
        console.log('DEBUG - Photo mission settings:', missionSettings);
      } catch (error) {
        console.error('Error retrieving photo data:', error);
        // Fallback for errors
        missionSettings = {
          type: 'Photo',
          photo: null
        };
      }
    } else if (selectedMission === 'QR') {
      missionSettings = {
        type: 'QR'
      };
    }
    
    console.log('DEBUG - Mission data:', missionSettings);
    
    // Create the final mission object
    const missionObj = {
      id: `mission_${Date.now()}`,
      name: selectedMission,
      icon: selectedMission.toLowerCase(), // Or use a function to get the icon
      settings: missionSettings
    };
    
    console.log('DEBUG - Final mission object:', missionObj);
    
    // Save the mission
    setMission(missionObj);
  };

  // When a photo is taken/selected
  const handlePhotoSelected = (photoUri: string) => {
    // Save the photo data to AsyncStorage for later use
    const photoData = {
      photo: photoUri,
      type: 'Photo'
    };
    
    AsyncStorage.setItem('photoMissionData', JSON.stringify(photoData))
      .then(() => {
        console.log('Photo mission data saved:', photoData);
      })
      .catch(error => {
        console.error('Error saving photo mission data:', error);
      });
  };

  useEffect(() => {
    const loadMissionSettings = async () => {
      try {
        const missionType = await AsyncStorage.getItem('selectedMissionType');
        console.log('New Alarm - Loading mission type:', missionType);
        
        if (missionType) {
          setMissionType(missionType);
          console.log('New Alarm - Set mission type to:', missionType);
          
          // Load mission settings based on type
          if (missionType === 'Math') {
            const mathSettingsJson = await AsyncStorage.getItem('selectedMissionSettings');
            if (mathSettingsJson) {
              const mathSettings = JSON.parse(mathSettingsJson);
              setMissionSettings(mathSettings);
              console.log('New Alarm - Loaded math settings:', mathSettings);
            }
          } else if (missionType === 'Photo') {
            const photoUri = await AsyncStorage.getItem('selectedAlarmPhoto');
            if (photoUri) {
              setMissionSettings({ photo: photoUri });
              console.log('New Alarm - Loaded photo settings:', { photo: photoUri });
            }
          } else if (missionType === 'QR/Barcode') {
            // First try to get from selectedMissionSettings
            const qrSettingsJson = await AsyncStorage.getItem('selectedMissionSettings');
            if (qrSettingsJson) {
              const qrSettings = JSON.parse(qrSettingsJson);
              setMissionSettings(qrSettings);
              console.log('New Alarm - Loaded QR settings from selectedMissionSettings:', qrSettings);
            } else {
              // Fallback to selectedAlarmQR
              const qrCode = await AsyncStorage.getItem('selectedAlarmQR');
              if (qrCode) {
                const qrSettings = { targetCode: qrCode };
                setMissionSettings(qrSettings);
                console.log('New Alarm - Loaded QR settings from selectedAlarmQR:', qrSettings);
              } else {
                console.log('New Alarm - No QR settings found');
              }
            }
          } else if (missionType === 'Typing') {
            const typingSettingsJson = await AsyncStorage.getItem('selectedMissionSettings');
            if (typingSettingsJson) {
              const typingSettings = JSON.parse(typingSettingsJson);
              setMissionSettings(typingSettings);
              console.log('New Alarm - Loaded typing settings:', typingSettings);
            }
          }
        }
      } catch (error) {
        console.error('Error loading mission settings:', error);
      }
    };
    
    loadMissionSettings();
  }, []);

  // Update the useEffect for Wordle mission type
  useEffect(() => {
    // Check for Wordle mission type from params
    if (params.selectedMissionType === 'Wordle') {
      console.log('Setting Wordle mission type');
      setMissionType('Wordle');
      
      // Create default Wordle settings
      const wordleSettings = {
        difficulty: 'medium',
        times: 1,
        timeLimit: 90 // 90 seconds
      };
      
      // Save mission type and settings
      Promise.all([
        AsyncStorage.setItem('selectedMissionType', 'Wordle'),
        AsyncStorage.setItem('wordleSettings', JSON.stringify(wordleSettings))
      ])
      .then(() => {
        console.log('Wordle mission type and settings saved');
        setMissionSettings(wordleSettings);
      })
      .catch(error => {
        console.error('Error saving Wordle mission:', error);
      });
    }
  }, [params.selectedMissionType]);

  useEffect(() => {
    // Only process mission data if we're editing or coming from mission selector
    if ((params.editMode === 'true' || params.fromMissionSelector === 'true') && params.mission) {
      try {
        // Your existing mission parsing code...
      } catch (error) {
        console.error('Error processing mission data:', error);
      }
    }
    // Otherwise, ensure mission is cleared for new alarms
    else if (!params.editMode && !params.fromMissionSelector) {
      setMissionType(null);
      setMissionName('');
      setMissionIcon('');
      setMissionSettings({});
      setHasMission(false);
    }
  }, [params.mission, params.selectedMissionType, params.editMode, params.fromMissionSelector]);

  useEffect(() => {
    const loadMissionType = async () => {
      try {
        const missionType = await AsyncStorage.getItem('selectedMissionType');
        const missionEmoji = await AsyncStorage.getItem('selectedMissionEmoji');
        
        if (missionType) {
          setMissionType(missionType);
        }
        
        if (missionEmoji) {
          setMissionEmoji(missionEmoji);
        }
      } catch (error) {
        console.error('Error loading mission type:', error);
      }
    };
    
    loadMissionType();
  }, []);

  // Helper function to get an icon based on mission type
  const getMissionIcon = (missionType: string): string => {
    switch(missionType.toLowerCase()) {
      case 'math': return 'calculator';
      case 'typing': return 'keyboard';
      case 'wordle': return 'game-controller';
      case 'qr': return 'qr-code';
      case 'steps': return 'walk';
      case 'cookiejam': return 'grid';
      default: return 'alarm';
    }
  };

  // Add this at the beginning of the component
  useEffect(() => {
    // Reset all state when component mounts
    const resetState = () => {
      console.log('Resetting alarm state, editMode:', params.editMode);
      
      // Only reset if we're not in edit mode
      if (params.editMode !== 'true') {
        // Set default values for a new alarm
        const now = new Date();
        setDate(now);
        setLabel('');
        setMission(null);
        setMissionType('');
        setHasMission(false);
        setSound('Beacon');
        setSoundVolume(1);
        setVibrationEnabled(true);
        setSnoozeEnabled(true);
        setSnoozeInterval(5);
        setMaxSnoozes(3);
        setWallpaper('sleepy'); // Reset wallpaper
        
        console.log('State reset for new alarm');
      } else {
        console.log('Not resetting state because we are in edit mode');
      }
    };
    
    resetState();
  }, []);

  // Add this to your useEffect in new-alarm.tsx where you initialize the component
  useEffect(() => {
    const checkPendingLabel = async () => {
      try {
        const pendingLabel = await AsyncStorage.getItem('pendingLabel');
        if (pendingLabel) {
          console.log('Found pending label:', pendingLabel);
          setLabel(pendingLabel);
          // Clear it after using
          await AsyncStorage.removeItem('pendingLabel');
        }
      } catch (error) {
        console.error('Error checking for pending label:', error);
      }
    };
    
    checkPendingLabel();
  }, []);

  // Add this useEffect to check for the label when the component is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadLabel = async () => {
        try {
          // Check for pendingLabel first (highest priority)
          const pendingLabel = await AsyncStorage.getItem('pendingLabel');
          if (pendingLabel) {
            console.log('Found pending label:', pendingLabel);
            setLabel(pendingLabel);
            await AsyncStorage.removeItem('pendingLabel');
            return;
          }
          
          // Then check for currentLabel
          const currentLabel = await AsyncStorage.getItem('currentLabel');
          if (currentLabel) {
            console.log('Found current label:', currentLabel);
            setLabel(currentLabel);
            await AsyncStorage.removeItem('currentLabel');
          }
        } catch (error) {
          console.error('Error loading label:', error);
        }
      };
      
      loadLabel();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const loadSelectedWallpaper = async () => {
        try {
          const selectedWallpaper = await AsyncStorage.getItem('selectedWallpaper');
          if (selectedWallpaper) {
            console.log('Loading selected wallpaper:', selectedWallpaper);
            setWallpaper(selectedWallpaper);
            // Clear it after using
            await AsyncStorage.removeItem('selectedWallpaper');
          }
        } catch (error) {
          console.error('Error loading selected wallpaper:', error);
        }
      };
      
      loadSelectedWallpaper();
    }, [])
  );

  useEffect(() => {
    // When wallpaper changes, check if it has a built-in sound
    const wallpaperData = [
      { id: 'Just do it', hasSound: true, sound: 'wall1' }
    ].find(w => w.id === wallpaper);
    
    if (wallpaperData?.hasSound) {
      setSound(wallpaperData.sound); // Automatically set sound to wall1
      console.log('Auto-selected sound for wallpaper:', wallpaperData.sound);
    }
  }, [wallpaper]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.closeButton}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.timePickerContainer}>
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (selectedDate) setDate(selectedDate);
          }}
          style={styles.picker}
          textColor="white"
        />
      </View>

      <ScrollView style={styles.content}>
        {/* Mission section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionButton}
            onPress={navigateToMissionSelector}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mission</Text>
              <Text style={[styles.sectionValue, { color: 'white' }]}>
                {missionType ? `${missionEmoji} ${missionType}` : 'None'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          
          {missionType && (
            <TouchableOpacity 
              style={styles.clearMissionButton}
              onPress={() => {
                setMissionType(null);
                AsyncStorage.removeItem('selectedMissionType');
              }}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Text style={styles.clearMissionText}>Clear Mission</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionButton} 
            onPress={() => navigateWithState('/sounds')}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Sound</Text>
              <Text style={styles.sectionValue}>
                {(() => {
                  // Check if current wallpaper has sound
                  const wallpaperData = [
                    { id: 'Just do it', hasSound: true, sound: 'wall1' }
                  ].find(w => w.id === wallpaper);
                  
                  if (wallpaperData?.hasSound) {
                    return `${wallpaperData.sound} (Theme Sound)`;
                  }
                  return sound;
                })()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.soundControls}>
            <View style={styles.volumeContainer}>
              <Ionicons name="volume-low" size={24} color="#fff" />
              <Slider
                style={styles.volumeSlider}
                value={soundVolume}
                onValueChange={setSoundVolume}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor="#00B4D8"
                maximumTrackTintColor="#666"
                thumbTintColor="#00B4D8"
              />
            </View>
          </View>
        </View>

        {/* Wallpaper section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionButton} 
            onPress={() => router.push('/wallpaper-selector')}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Wallpaper</Text>
              <Text style={styles.sectionValue}>{wallpaper}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Pressable
            style={styles.optionContainer}
            onPress={() => router.push({
              pathname: '/label',
              params: { alarmId: params.alarmId, currentLabel: label }
            })}
          >
            <Text style={styles.optionLabel}>Label</Text>
            <Text style={styles.optionValue}>{label || 'Add Label'}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable
            style={styles.optionContainer}
            onPress={() => router.push('/snooze')}
          >
            <Text style={styles.optionLabel}>Snooze</Text>
            <Text style={[styles.optionValue, { color: '#666' }]}>
              {snoozeEnabled ? 
                maxSnoozes === 999 ? `${snoozeInterval} min` : `${snoozeInterval} min, ${maxSnoozes} time${maxSnoozes !== 1 ? 's' : ''}` 
                : 'Off'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(60, 60, 60, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  timePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionValue: {
    color: '#666',
    fontSize: 15,
    marginTop: 4,
  },
  missionCount: {
    color: '#00BCD4',
    fontSize: 17,
  },
  missionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  missionBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  missionBoxDisabled: {
    borderStyle: 'dashed',
    borderColor: '#444',
    backgroundColor: 'transparent',
  },
  soundName: {
    color: '#666',
    fontSize: 17,
  },
  volumeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  saveButton: {
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  dailyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyText: {
    color: '#00BCD4',
    fontSize: 17,
  },
  soundControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
  },
  vibrationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 16,
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  sectionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalValue: {
    color: '#666',
    fontSize: 15,
    marginTop: 4,
  },
  labelInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 17,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    color: '#666',
    fontSize: 15,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  optionValue: {
    color: '#666',
    fontSize: 15,
  },
  missionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  clearMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 8,
  },
  clearMissionText: {
    color: '#FF3B30',
    fontSize: 15,
    marginLeft: 8,
  },
  intervalContainer: {
    marginTop: 20,
  },
  intervalList: {
    maxHeight: 200,
  },
  intervalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2C2C2E',
    marginVertical: 1,
    borderRadius: 8,
  },
  selectedInterval: {
    backgroundColor: '#3A3A3C',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00BCD4',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00BCD4',
  },
  intervalText: {
    color: '#fff',
    fontSize: 17,
  },
}); 