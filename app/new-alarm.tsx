import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Link, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Switch } from 'react-native';
import { scheduleAlarmNotification, cancelAlarmNotification } from './notifications';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';

interface Mission {
  id: string;
  name: string;
  icon: string;
}

interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
  days: string[];
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
}

// Add this helper function at the top of your file (outside the component)
const getDayNumber = (day: string): string => {
  // Convert day to string if it's not already
  const dayStr = day.toString();
  // Return the day as is - we're using 1-7 where 1=Monday, 7=Sunday
  return dayStr;
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
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
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
  const [missionSettings, setMissionSettings] = useState<any>(null);
  const [isUnlimitedSnoozes, setIsUnlimitedSnoozes] = useState(false);
  const [hasMission, setHasMission] = useState(false);
  const [missionName, setMissionName] = useState('');

  const days = [
    { label: 'S', value: 0 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
  ];

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
      selectedDays,
      mission: missionType
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
  }, [params]);

  const handleSave = async () => {
    try {
      console.log('NewAlarm: Starting save process');
      console.log('NewAlarm: isEditing:', isEditing, 'currentAlarmId:', currentAlarmId);
      console.log('NewAlarm: missionType:', missionType);
      console.log('NewAlarm: selectedDays:', selectedDays);
      
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

      // Create mission object if missionType exists
      let missionObj = null;
      if (missionType) {
        // Create a unique ID for the mission
        const missionId = `mission_${Date.now()}`;
        
        // Set icon based on mission type
        let missionIcon = 'calculator'; // Default
        if (missionType === 'Math') missionIcon = 'calculator';
        else if (missionType === 'Typing') missionIcon = 'keyboard';
        else if (missionType === 'Photo') missionIcon = 'camera';
        else if (missionType === 'QR/Barcode') missionIcon = 'qrcode';
        else if (missionType === 'Wordle') missionIcon = 'grid';
        
        // Create mission object
        missionObj = {
          id: missionId,
          name: missionType,
          icon: missionIcon,
          settings: missionSettings
        };
        
        console.log('NewAlarm: Created mission object:', missionObj);
      }

      console.log('NewAlarm: Final mission object:', missionObj);

      // Schedule notification first
      const notificationId = await scheduleAlarmNotification({
        id: isEditing ? currentAlarmId : `alarm_${Date.now()}`,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        days: selectedDays.map(String),
        mission: missionObj,
        sound: sound,
        soundVolume: soundVolume,
      });

      console.log('NewAlarm: Notification scheduled with ID:', notificationId);

      // Make sure days are properly saved as strings
      const daysAsStrings = selectedDays.map(String);
      console.log('NewAlarm: Days as strings for saving:', daysAsStrings);

      const newAlarm: Alarm = {
        id: isEditing ? currentAlarmId : `alarm_${Date.now()}`,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        enabled: true,
        days: daysAsStrings, // Save days as strings
        label: label || '',
        mission: missionObj,
        sound: sound,
        soundVolume: soundVolume,
        vibration: vibrationEnabled,
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
        console.log('Loading existing alarm:', params.alarmId);
        const existingAlarms = await AsyncStorage.getItem('alarms');
        if (existingAlarms) {
          const alarms = JSON.parse(existingAlarms);
          const currentAlarm = alarms.find((a: Alarm) => a.id === params.alarmId);
          if (currentAlarm) {
            console.log('Found current alarm:', currentAlarm);
            setDate(new Date());
            setSelectedDays(currentAlarm.days);
            setLabel(currentAlarm.label);
            setMission(currentAlarm.mission);
            setSound(currentAlarm.sound);
            setSoundVolume(currentAlarm.soundVolume);
            setVibrationEnabled(currentAlarm.vibration);
            setHasMission(!!currentAlarm.mission);
          }
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
      setSelectedDays(state.selectedDays || []);
      setSelectedMission(state.selectedMission || '');
      setVibrationEnabled(state.vibrationEnabled);
      if (state.date) {
        setDate(new Date(state.date));
      }
    }
  };

  const navigateWithState = async (pathname: string) => {
    const currentState = {
      label,
      sound,
      selectedDays,
      selectedMission,
      vibrationEnabled,
      date: date.toISOString(),
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
          if (state.selectedDays) setSelectedDays(state.selectedDays);
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

  const getMissionEmoji = (missionType: string) => {
    switch (missionType) {
      case 'Math':
        return '🔢';
      case 'Typing':
        return '⌨️';
      case 'QR/Barcode':
        return '📱';
      case 'Photo':
        return '📸';
      default:
        return '';
    }
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

  // Fix the days parsing in the useEffect
  useEffect(() => {
    if (params.days) {
      try {
        console.log('NewAlarm: Raw days param:', params.days);
        
        // Handle different possible formats of the days parameter
        let daysArray;
        
        if (typeof params.days === 'string') {
          // If it's a single day as a string (like "7")
          if (params.days.includes('[') || params.days.includes(',')) {
            // It's a JSON string array or comma-separated list
            try {
              daysArray = JSON.parse(params.days);
            } catch (jsonError) {
              // If JSON parsing fails, try comma-separated string
              daysArray = params.days.split(',').filter(day => day.trim() !== '');
            }
          } else {
            // It's a single day (like "7")
            daysArray = [params.days];
          }
        } else if (Array.isArray(params.days)) {
          // Already an array
          daysArray = params.days;
        } else {
          // Default to empty array if format is unknown
          daysArray = [];
        }
        
        console.log('NewAlarm: Parsed days array:', daysArray);
        
        // Ensure all days are strings
        const daysAsStrings = Array.isArray(daysArray) 
          ? daysArray.map(day => day.toString())
          : [daysArray.toString()];
        
        console.log('NewAlarm: Final days as strings:', daysAsStrings);
        setSelectedDays(daysAsStrings);
      } catch (error) {
        console.error('NewAlarm: Error parsing days from params:', error);
        // Set to empty array as fallback
        setSelectedDays([]);
      }
    }
  }, [params.days]);

  // Inside your component, update the toggleDay function
  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      // Make sure prev is an array
      const prevDays = Array.isArray(prev) ? prev : [];
      const dayNumber = getDayNumber(day);
      
      if (prevDays.includes(dayNumber)) {
        return prevDays.filter(d => d !== dayNumber);
      } else {
        return [...prevDays, dayNumber];
      }
    });
  };

  // Add this effect to load days when editing an alarm
  useEffect(() => {
    const loadAlarmDays = async () => {
      if (isEditing && currentAlarmId) {
        console.log('NewAlarm: Loading days for editing alarm:', currentAlarmId);
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (alarmsJson) {
          const alarms = JSON.parse(alarmsJson);
          const currentAlarm = alarms.find((a: Alarm) => a.id === currentAlarmId);
          if (currentAlarm && currentAlarm.days) {
            // Convert days from strings to numbers
            const daysAsNumbers = currentAlarm.days.map(Number);
            console.log('NewAlarm: Loaded days:', daysAsNumbers);
            setSelectedDays(daysAsNumbers.map(String));
          }
        }
      }
    };
    
    loadAlarmDays();
  }, [isEditing, currentAlarmId]);

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
    // Load mission from params if available
    if (params.mission) {
      try {
        // Check if the mission is already a valid object
        let missionData;
        if (typeof params.mission === 'string') {
          // Try to parse it as JSON
          try {
            missionData = JSON.parse(params.mission);
          } catch (parseError) {
            console.error('Error parsing mission data:', parseError);
            // If it fails to parse, try to use it as a string
            missionData = {
              name: params.mission,
              icon: '🧩',
              settings: { type: params.mission }
            };
          }
        } else {
          // It's already an object
          missionData = params.mission;
        }
        
        console.log('New Alarm - Parsed mission data:', missionData);
        
        // Set mission name and icon
        if (missionData.name) setMissionName(missionData.name);
        if (missionData.icon) setMissionIcon(missionData.icon);
        
        // Set mission type based on settings.type
        if (missionData.settings && missionData.settings.type) {
          const missionType = missionData.settings.type;
          console.log('New Alarm - Setting mission type from settings:', missionType);
          setMissionType(missionType);
          setMissionSettings(missionData.settings);
          setHasMission(true);
        }
      } catch (error) {
        console.error('Error processing mission data:', error);
      }
    } 
    // Fallback to legacy params if mission JSON is not available
    else if (params.selectedMissionType) {
      console.log('New Alarm - Loading mission type:', params.selectedMissionType);
      setMissionType(params.selectedMissionType as string);
      if (params.selectedMissionName) setMissionName(params.selectedMissionName as string);
      if (params.selectedMissionIcon) setMissionIcon(params.selectedMissionIcon as string);
      setHasMission(true);
      
      if (params.missionSettings) {
        try {
          if (typeof params.missionSettings === 'string') {
            setMissionSettings(JSON.parse(params.missionSettings));
          } else {
            setMissionSettings(params.missionSettings);
          }
        } catch (error) {
          console.error('Error parsing mission settings:', error);
        }
      }
    }
  }, [params.mission, params.selectedMissionType]);

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
        {/* Days of week section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily</Text>
            <TouchableOpacity 
              onPress={() => {
                if (selectedDays.length === 7) {
                  setSelectedDays([]);
                } else {
                  setSelectedDays(['1', '2', '3', '4', '5', '6', '7']);
                }
              }}
              style={styles.dailyContainer}
            >
              <Ionicons 
                name={selectedDays.length === 7 ? "checkbox" : "square-outline"} 
                size={20} 
                color="#00BCD4" 
              />
              <Text style={styles.dailyText}>Daily</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.daysContainer}>
            {['1', '2', '3', '4', '5', '6', '7'].map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day) && styles.selectedDay
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays.includes(day) && styles.selectedDayText
                ]}>
                  {getDayLabel(day)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mission section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionButton}
            onPress={navigateToMissionSelector}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mission</Text>
              <Text style={[styles.sectionValue, { color: 'white' }]}>
                {missionType ? `${getMissionEmoji(missionType)} ${missionType}` : 'None'}
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
              <Text style={styles.sectionValue}>{sound}</Text>
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
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDay: {
    backgroundColor: '#00BCD4',
  },
  dayText: {
    color: '#00BCD4',
    fontSize: 17,
  },
  selectedDayText: {
    color: '#fff',
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

// Helper function to convert day numbers to labels
function getDayLabel(day: string) {
  const labels = {
    '1': 'M',
    '2': 'T',
    '3': 'W',
    '4': 'T',
    '5': 'F',
    '6': 'S',
    '7': 'S'
  };
  return labels[day as keyof typeof labels] || day;
} 