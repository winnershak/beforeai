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
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
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
        
        // Special handling for QR/Barcode mission
        if (missionType === 'QR/Barcode') {
          // Get the QR code directly from AsyncStorage
          const qrCode = await AsyncStorage.getItem('selectedAlarmQR');
          console.log('NewAlarm: Retrieved QR code:', qrCode);
          
          // Create mission object with QR code in settings
          missionObj = {
            id: missionId,
            name: missionType,
            icon: missionIcon,
            settings: { targetCode: qrCode }
          };
          
          console.log('NewAlarm: Created mission with QR settings:', missionObj);
        } else {
          // For other mission types
          missionObj = {
            id: missionId,
            name: missionType,
            icon: missionIcon,
            settings: missionSettings
          };
        }
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

      const newAlarm: Alarm = {
        id: isEditing ? currentAlarmId : `alarm_${Date.now()}`,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        enabled: true,
        days: selectedDays.map(String),
        label: label || '',
        mission: missionObj,
        sound: sound,
        soundVolume: soundVolume,
        vibration: vibrationEnabled,
        notificationId: notificationId || null,
        snooze: {
          enabled: snoozeEnabled,
          maxSnoozes,
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
    const loadSnoozeSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('snoozeSettings');
        if (settings) {
          const { enabled, max, interval } = JSON.parse(settings);
          setSnoozeEnabled(enabled);
          setMaxSnoozes(max);
          setSnoozeInterval(interval);
        }
      } catch (error) {
        console.error('Error loading snooze settings:', error);
      }
    };
    loadSnoozeSettings();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.editMode === 'true' ? 'Edit Alarm' : 'New Alarm'}
        </Text>
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
                  setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
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
            {days.map((day, index) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDays.includes(index) && styles.selectedDay
                ]}
                onPress={() => {
                  if (selectedDays.includes(index)) {
                    setSelectedDays(selectedDays.filter(d => d !== index));
                  } else {
                    setSelectedDays([...selectedDays, index]);
                  }
                }}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays.includes(index) && styles.selectedDayText
                ]}>{day.label}</Text>
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
            <View style={styles.vibrationToggle}>
              <Ionicons name="phone-portrait" size={24} color="#fff" />
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: '#767577', true: '#00BCD4' }}
                thumbColor={vibrationEnabled ? '#fff' : '#f4f3f4'}
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
              {snoozeEnabled ? `${snoozeInterval} min, ${maxSnoozes} times` : 'Off'}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
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