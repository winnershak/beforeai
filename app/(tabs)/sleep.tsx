import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Image, Platform, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Define task name constant
const SLEEP_TIME_CHECK = 'sleep-time-check';

// Day names for display
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Define sound assets at the top level
const soundAssets = {
  'orkney': require('../../assets/sounds/orkney.caf'),
};

// First, configure notifications properly at the top of your file
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 1. First, define the background task properly
// Add this near the top of your file, after imports
TaskManager.defineTask(SLEEP_TIME_CHECK, async () => {
  try {
    const isBedtime = await checkIfBedtime();
    if (isBedtime) {
      await scheduleBedtimeNotification();
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Move checkIfBedtime outside the component
const checkIfBedtime = async () => {
  try {
    console.log('Checking if it\'s bedtime...');
    
    // Check network connectivity first
    const isConnected = await checkConnectivity();
    if (!isConnected) {
      console.log('Not connected to network, no need for notifications');
      return false;
    }
    
    // Get current time and day
    const now = new Date();
    const currentDay = now.getDay();
    
    // Load sleep settings from AsyncStorage
    const sleepSettingsJson = await AsyncStorage.getItem('sleepSettings');
    if (!sleepSettingsJson) {
      console.log('No sleep settings found');
      return false;
    }
    
    const settings = JSON.parse(sleepSettingsJson);
    
    // Log the settings to debug
    console.log('Sleep settings:', JSON.stringify(settings));
    
    // Check if sleep is enabled and if the current day is selected
    if (!settings.enabled) {
      console.log('Sleep time is disabled');
      return false;
    }
    
    if (!settings.days || !settings.days[currentDay]) {
      console.log('Current day is not selected:', currentDay);
      return false;
    }
    
    console.log('Current day is selected:', currentDay);
    
    // Get bedtime and wake time for today
    const bedTimeObj = new Date(settings.sleepTimes[currentDay].bedTime);
    const wakeTimeObj = new Date(settings.sleepTimes[currentDay].wakeTime);
    
    // Convert to minutes since midnight for easier comparison
    const bedTimeMinutes = bedTimeObj.getHours() * 60 + bedTimeObj.getMinutes();
    const wakeTimeMinutes = wakeTimeObj.getHours() * 60 + wakeTimeObj.getMinutes();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Check if current time is between bedtime and wake time
    let isWithinSleepTime = false;
    
    // Handle cases where wake time is on the next day
    if (wakeTimeMinutes < bedTimeMinutes) {
      // Wake time is on the next day (e.g., bed: 3pm, wake: 7am)
      isWithinSleepTime = (currentTimeMinutes >= bedTimeMinutes || currentTimeMinutes <= wakeTimeMinutes);
      console.log(`Sleep spans overnight. Within sleep time: ${isWithinSleepTime}`);
    } else {
      // Wake time is on the same day
      isWithinSleepTime = (currentTimeMinutes >= bedTimeMinutes && currentTimeMinutes <= wakeTimeMinutes);
      console.log(`Sleep on same day. Within sleep time: ${isWithinSleepTime}`);
    }
    
    if (isWithinSleepTime) {
      console.log('It is bedtime now!');
      
      // Send multiple notifications in sequence
      await startRecurringNotifications(15); // Check every 15 minutes
      return true;
    } else {
      console.log('Not bedtime yet');
      return false;
    }
  } catch (error) {
    console.error('Error checking bedtime:', error);
    return false;
  }
};

// Update the testBedtimeNotification function
const testBedtimeNotification = async () => {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow notifications to use this feature.');
      return;
    }
    
    // Play custom sound directly
    await playSound('orkney');
    
    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bedtime Test',
        body: 'This is a test of your bedtime notification!',
        sound: 'orkney.caf',
        data: { soundName: 'orkney' },
      },
      trigger: null,
    });
    
    Alert.alert('Test notification sent', 'A notification with custom sound has been sent.');
  } catch (error) {
    console.error('Notification error:', error);
    Alert.alert('Notification Error', 'Could not send test notification: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
};

// Add a function to play sounds
const playSound = async (soundName: keyof typeof soundAssets) => {
  try {
    const soundFile = soundAssets[soundName];
    if (!soundFile) {
      console.error(`Sound ${soundName} not found`);
      return;
    }
    
    // Configure audio mode first
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
    });
    
    // Create and play the sound
    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: true,
        volume: 1.0,
      }
    );
    
    // Unload when finished
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
    
    return sound;
  } catch (error) {
    console.error('Error playing sound:', error);
    return null;
  }
};

// Update the scheduleBedtimeNotification function
const scheduleBedtimeNotification = async (sequenceNumber = 1) => {
  try {
    // Check if connected to the internet
    const isConnected = await checkConnectivity();
    
    if (isConnected) {
      // Create more urgent messages for repeated notifications
      const messages = [
        'Please turn off your WiFi and cellular data for better sleep.',
        'You\'re still connected! Please disconnect for better sleep.',
        'URGENT: Disconnect from the internet for your sleep health!',
        'Final reminder: Please disconnect now for better sleep quality!'
      ];
      
      const messageIndex = Math.min(sequenceNumber - 1, messages.length - 1);
      
      // Only send notification if connected
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Bedtime Reminder ${sequenceNumber > 1 ? '#' + sequenceNumber : ''}`,
          body: messages[messageIndex],
          sound: 'orkney.caf',
          data: { action: 'openNetworkSettings' },
          priority: 'high',
        },
        trigger: null,
      });
      
      // Also play sound directly
      await playSound('orkney');
      
      // Show a simpler alert with just one option
      Alert.alert(
        `Bedtime Reminder ${sequenceNumber > 1 ? '#' + sequenceNumber : ''}`,
        messages[messageIndex],
        [
          {
            text: 'Turn Off Connectivity',
            onPress: () => openNetworkSettings()
          },
          {
            text: 'Remind in 15 Minutes',
            style: 'cancel'
          }
        ]
      );
    } else {
      // If already disconnected, do nothing - don't wake the user
      console.log('Already disconnected, not sending notification');
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Add function to open airplane mode settings
const openAirplaneSettings = () => {
  if (Platform.OS === 'ios') {
    // On iOS, we can only open the main Settings app
    Linking.openURL('App-Prefs:root=AIRPLANE_MODE');
  } else {
    // On Android, we can try to open airplane settings directly
    Linking.openSettings();
  }
};

// Set up notification handler to handle taps
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if this is our network settings notification
    if (notification.request.content.data?.action === 'openNetworkSettings') {
      // Open network settings when notification is tapped
      openNetworkSettings();
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

// Move checkConnectivity outside too
const checkConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.google.com/', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Network check failed:', error);
    return false;
  }
};

// Add this function to open network settings
const openNetworkSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('App-Prefs:root=WIFI');
  } else {
    Linking.openSettings();
  }
};

// Replace sendSequentialNotifications with this version:
const startRecurringNotifications = async (intervalMinutes = 15) => {
  // First notification immediately
  await scheduleBedtimeNotification();
  
  // Set up recurring notifications
  const intervalId = setInterval(async () => {
    // Check if still connected and if it's still bedtime
    const isConnected = await checkConnectivity();
    const isBedtime = await isCurrentlyBedtime(); // New helper function
    
    if (isConnected && isBedtime) {
      // Get the next sequence number (cycling through 1-4)
      const nextSeq = (Date.now() / (intervalMinutes * 60000)) % 4 + 1;
      await scheduleBedtimeNotification(Math.floor(nextSeq));
    } else {
      // If disconnected or no longer bedtime, clear the interval
      clearInterval(intervalId);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Store the interval ID to clear it later if needed
  return intervalId;
};

// Helper function to check if current time is bedtime
const isCurrentlyBedtime = async () => {
  try {
    // Get current time and day
    const now = new Date();
    const currentDay = now.getDay();
    
    // Load sleep settings from AsyncStorage
    const sleepSettingsJson = await AsyncStorage.getItem('sleepSettings');
    if (!sleepSettingsJson) return false;
    
    const settings = JSON.parse(sleepSettingsJson);
    if (!settings.enabled || !settings.days || !settings.days[currentDay]) return false;
    
    // Get bedtime and wake time for today
    const bedTimeObj = new Date(settings.sleepTimes[currentDay].bedTime);
    const wakeTimeObj = new Date(settings.sleepTimes[currentDay].wakeTime);
    
    // Convert to minutes since midnight for easier comparison
    const bedTimeMinutes = bedTimeObj.getHours() * 60 + bedTimeObj.getMinutes();
    const wakeTimeMinutes = wakeTimeObj.getHours() * 60 + wakeTimeObj.getMinutes();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Check if current time is between bedtime and wake time
    let isWithinSleepTime = false;
    
    // Handle cases where wake time is on the next day
    if (wakeTimeMinutes < bedTimeMinutes) {
      isWithinSleepTime = (currentTimeMinutes >= bedTimeMinutes || currentTimeMinutes <= wakeTimeMinutes);
    } else {
      isWithinSleepTime = (currentTimeMinutes >= bedTimeMinutes && currentTimeMinutes <= wakeTimeMinutes);
    }
    
    return isWithinSleepTime;
  } catch (error) {
    console.error('Error checking current bedtime:', error);
    return false;
  }
};

// Add this function before it's used in checkIfBedtime
const sendSequentialNotifications = async (count = 4, delaySeconds = 60) => {
  // First notification immediately
  await scheduleBedtimeNotification(1);
  
  // Schedule subsequent notifications with delays
  for (let i = 1; i < count; i++) {
    setTimeout(async () => {
      // Check if still connected before sending next notification
      const stillConnected = await checkConnectivity();
      if (stillConnected) {
        await scheduleBedtimeNotification(i + 1); // Pass notification number
      }
    }, i * delaySeconds * 1000);
  }
};

export default function SleepTimeScreen() {
  // Sleep times for each day of the week
  const [sleepTimes, setSleepTimes] = useState([
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Sunday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Monday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Tuesday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Wednesday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Thursday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Friday
    { bedTime: new Date(new Date().setHours(22, 0)), wakeTime: new Date(new Date().setHours(7, 0)) }, // Saturday
  ]);
  
  const [selectedDays, setSelectedDays] = useState([true, true, true, true, true, true, true]);
  const [activeDays, setActiveDays] = useState([0]); // Default to Sunday
  
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isBackgroundTaskRegistered, setIsBackgroundTaskRegistered] = useState(false);

  // Add state for modal time selection
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [editingBedTime, setEditingBedTime] = useState(true); // true for bedtime, false for waketime
  const [tempSelectedTime, setTempSelectedTime] = useState(new Date());

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sleep time reminders need notification permissions to work properly.',
          [{ text: 'OK' }]
        );
      }
    };
    
    requestPermissions();
  }, []);

  // Load saved sleep settings
  useEffect(() => {
    loadSleepSettings();
    checkNetworkStatus();
    
    // Set up background task
    const setupBackgroundTask = async () => {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(SLEEP_TIME_CHECK);
      setIsBackgroundTaskRegistered(isRegistered);
      
      if (!isRegistered) {
        try {
          await BackgroundFetch.registerTaskAsync(SLEEP_TIME_CHECK, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
          });
          setIsBackgroundTaskRegistered(true);
        } catch (error) {
          console.error('Error registering background task:', error);
        }
      }
    };
    
    setupBackgroundTask();
  }, []);

  // Use this instead of NetInfo
  const checkNetworkStatus = async () => {
    try {
      const isConnected = await checkConnectivity();
      setIsConnected(isConnected);
      
      // Set up polling
      const intervalId = setInterval(async () => {
        try {
          const connected = await checkConnectivity();
          setIsConnected(connected);
        } catch (error) {
          console.error('Error checking network:', error);
        }
      }, 30000);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Error checking network:', error);
      return () => {};
    }
  };

  const loadSleepSettings = async () => {
    try {
      const sleepSettingsJson = await AsyncStorage.getItem('sleepSettings');
      if (sleepSettingsJson) {
        const settings = JSON.parse(sleepSettingsJson);
        if (settings.sleepTimes) {
          setSleepTimes(settings.sleepTimes.map((item: any) => ({
            bedTime: new Date(item.bedTime),
            wakeTime: new Date(item.wakeTime)
          })));
        }
        if (settings.days) setSelectedDays(settings.days);
        if (settings.enabled !== undefined) setIsEnabled(settings.enabled);
      }
    } catch (error) {
      console.error('Error loading sleep settings:', error);
    }
  };

  const saveSleepSettings = async () => {
    try {
      const settings = {
        sleepTimes: sleepTimes.map(item => ({
          bedTime: item.bedTime.toISOString(),
          wakeTime: item.wakeTime.toISOString()
        })),
        days: selectedDays,
        enabled: isEnabled
      };
      
      // Log what we're saving
      console.log('Saving sleep settings:', JSON.stringify(settings));
      
      await AsyncStorage.setItem('sleepSettings', JSON.stringify(settings));
      
      // Register or update the background task
      if (isEnabled) {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(SLEEP_TIME_CHECK);
          if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(SLEEP_TIME_CHECK, {
              minimumInterval: 15 * 60, // 15 minutes
              stopOnTerminate: false,
              startOnBoot: true,
            });
            console.log('Background task registered for sleep time checks');
          }
        } catch (error) {
          console.error('Error registering background task:', error);
        }
      }
      
      Alert.alert(
        'Sleep Time Saved!', 
        `Your phone will remind you to disconnect at your set bedtimes on the days you selected.`,
        [{ text: 'Got it!' }]
      );
    } catch (error) {
      console.error('Error saving sleep settings:', error);
      Alert.alert('Oops!', 'Couldn\'t save your sleep time.');
    }
  };

  const toggleDay = (dayIndex: number) => {
    // Toggle selection
    const newSelectedDays = [...selectedDays];
    newSelectedDays[dayIndex] = !newSelectedDays[dayIndex];
    setSelectedDays(newSelectedDays);
    
    // If day becomes selected, add to active days
    // If day becomes unselected, remove from active days
    if (newSelectedDays[dayIndex]) {
      setActiveDays([...activeDays, dayIndex]);
    } else {
      setActiveDays(activeDays.filter(day => day !== dayIndex));
    }
  };

  // Add a function to toggle active status without affecting selection
  const toggleActiveDay = (dayIndex: number) => {
    if (activeDays.includes(dayIndex)) {
      // If already active, remove it (unless it's the only active day)
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter(day => day !== dayIndex));
      }
    } else {
      // If not active, add it
      setActiveDays([...activeDays, dayIndex]);
    }
  };

  // Apply settings to all weekdays
  const setWeekdays = () => {
    setSelectedDays([false, true, true, true, true, true, false]);
    
    // Copy active day settings to all weekdays
    const activeDaySettings = sleepTimes[activeDays[0]];
    const newSleepTimes = [...sleepTimes];
    
    activeDays.forEach(day => {
      newSleepTimes[day] = {
        bedTime: new Date(activeDaySettings.bedTime),
        wakeTime: new Date(activeDaySettings.wakeTime)
      };
    });
    
    setSleepTimes(newSleepTimes);
  };

  // Apply settings to weekends
  const setWeekends = () => {
    setSelectedDays([true, false, false, false, false, false, true]);
    
    // Copy active day settings to both weekend days
    const activeDaySettings = sleepTimes[activeDays[0]];
    const newSleepTimes = [...sleepTimes];
    
    activeDays.forEach(day => {
      newSleepTimes[day] = {
        bedTime: new Date(activeDaySettings.bedTime),
        wakeTime: new Date(activeDaySettings.wakeTime)
      };
    });
    
    setSleepTimes(newSleepTimes);
  };

  // Apply settings to all days
  const setAllDays = () => {
    setSelectedDays([true, true, true, true, true, true, true]);
    
    // Copy active day settings to all days
    const activeDaySettings = sleepTimes[activeDays[0]];
    const newSleepTimes = [...sleepTimes];
    
    activeDays.forEach(day => {
      newSleepTimes[day] = {
        bedTime: new Date(activeDaySettings.bedTime),
        wakeTime: new Date(activeDaySettings.wakeTime)
      };
    });
    
    setSleepTimes(newSleepTimes);
  };

  // Format time for display
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };

  // Update the openTimePicker function
  const openTimePicker = (isBedTime: boolean) => {
    // Check if there are any active days
    if (activeDays.length === 0) {
      Alert.alert(
        "No Days Selected", 
        "Please select at least one day to edit first."
      );
      return;
    }
    
    setEditingBedTime(isBedTime);
    setTempSelectedTime(isBedTime ? sleepTimes[activeDays[0]].bedTime : sleepTimes[activeDays[0]].wakeTime);
    setTimeModalVisible(true);
  };

  // Add the saveSelectedTime function
  const saveSelectedTime = () => {
    const newSleepTimes = [...sleepTimes];
    
    // Apply the time change to all active days
    activeDays.forEach(dayIndex => {
      if (editingBedTime) {
        newSleepTimes[dayIndex].bedTime = new Date(tempSelectedTime);
      } else {
        newSleepTimes[dayIndex].wakeTime = new Date(tempSelectedTime);
      }
    });
    
    setSleepTimes(newSleepTimes);
    setTimeModalVisible(false);
  };

  const handleBedTimeChange = (_event: any, selectedTime?: Date) => {
    setShowBedTimePicker(false);
    if (selectedTime) {
      const newSleepTimes = [...sleepTimes];
      
      // Apply to all selected days
      activeDays.forEach((dayIndex) => {
        newSleepTimes[dayIndex].bedTime = selectedTime;
      });
      
      setSleepTimes(newSleepTimes);
    }
  };

  const handleWakeTimeChange = (_event: any, selectedTime?: Date) => {
    setShowWakeTimePicker(false);
    if (selectedTime) {
      const newSleepTimes = [...sleepTimes];
      
      // Apply to all selected days
      activeDays.forEach((dayIndex) => {
        newSleepTimes[dayIndex].wakeTime = selectedTime;
      });
      
      setSleepTimes(newSleepTimes);
    }
  };

  // Add this function to quickly disable weekends
  const disableWeekends = () => {
    const newSelectedDays = [...selectedDays];
    // Set Sunday (0) and Saturday (6) to false
    newSelectedDays[0] = false;
    newSelectedDays[6] = false;
    setSelectedDays(newSelectedDays);
    
    // Remove weekends from active days if they were active
    setActiveDays(activeDays.filter(day => day !== 0 && day !== 6));
  };

  // Add a separate function to test just the sound
  const testSound = async () => {
    try {
      console.log('Testing sound...');
      
      // Try using a different sound format that's more widely supported
      const soundObject = new Audio.Sound();
      
      // Try with a system sound instead
      await soundObject.loadAsync(require('../assets/sounds/notification.mp3'));
      await soundObject.playAsync();
      
      soundObject.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          soundObject.unloadAsync();
        }
      });
      
      Alert.alert('Sound test', 'Did you hear the sound?');
    } catch (error) {
      console.error('Sound error:', error);
      Alert.alert('Sound Error', 'Could not play sound: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  };

  // Add this to your component's useEffect
  useEffect(() => {
    const checkTaskRegistration = async () => {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(SLEEP_TIME_CHECK);
      console.log('Background task registered:', isRegistered);
      setIsBackgroundTaskRegistered(isRegistered);
      
      if (!isRegistered) {
        try {
          await BackgroundFetch.registerTaskAsync(SLEEP_TIME_CHECK, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('Background task registered successfully');
          setIsBackgroundTaskRegistered(true);
        } catch (error) {
          console.error('Error registering background task:', error);
        }
      }
    };
    
    checkTaskRegistration();
  }, []);

  // Add to your component's useEffect:
  useEffect(() => {
    // Register for background fetch
    const registerBackgroundFetch = async () => {
      try {
        await BackgroundFetch.registerTaskAsync(SLEEP_TIME_CHECK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background fetch registered!');
      } catch (error) {
        console.error('Background fetch registration failed:', error);
      }
    };
    
    registerBackgroundFetch();
    
    // Immediately check if it's bedtime when the app opens
    checkIfBedtime();
    
    return () => {
      // Clean up
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sleep Time</Text>
        <Switch
          value={isEnabled}
          onValueChange={setIsEnabled}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {isEnabled ? (
        <ScrollView style={styles.content}>
          {/* Save button at the very top */}
          <TouchableOpacity 
            style={styles.prominentSaveButton} 
            onPress={saveSleepSettings}
          >
            <Text style={styles.prominentSaveButtonText}>Save Sleep Settings</Text>
          </TouchableOpacity>
          
          {/* Day Selection - Now above the time settings */}
          <View style={styles.section}>
            {/* Day Selection with minimal labels */}
            <View style={styles.daySelectionContainer}>
              <Text style={styles.compactLabel}>Enable/Disable:</Text>
              <View style={styles.daysContainer}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      selectedDays[index] && styles.selectedDay,
                      !selectedDays[index] && styles.disabledDay
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[
                      styles.dayText, 
                      selectedDays[index] && styles.selectedDayText,
                      !selectedDays[index] && styles.disabledDayText
                    ]}>
                      {day}
                    </Text>
                    {!selectedDays[index] && (
                      <View style={styles.disabledIndicator}>
                        <Ionicons name="close-circle" size={10} color="#ff6b6b" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Day Editing Selection - more compact */}
            <View style={styles.daySelectionContainer}>
              <Text style={styles.compactLabel}>Select to Edit:</Text>
              <View style={styles.daysContainer}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.editDayButton,
                      activeDays.includes(index) && styles.activeEditDay,
                      !selectedDays[index] && styles.disabledEditDay
                    ]}
                    onPress={() => toggleActiveDay(index)}
                    disabled={!selectedDays[index]}
                  >
                    <Text style={[
                      styles.dayText, 
                      activeDays.includes(index) && styles.activeEditDayText,
                      !selectedDays[index] && styles.disabledDayText
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Quick Selection Buttons - clarify they're for editing */}
            <View style={styles.quickPresetContainer}>
              <TouchableOpacity 
                style={styles.smallPresetButton} 
                onPress={() => {
                  // First select weekdays in the edit row
                  const weekdayIndices = [1, 2, 3, 4, 5]; // Mon-Fri
                  setActiveDays(weekdayIndices.filter(idx => selectedDays[idx]));
                }}
              >
                <Ionicons name="briefcase" size={14} color="#fff" style={styles.smallPresetIcon} />
                <Text style={styles.smallPresetText}>Edit Weekdays</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.smallPresetButton} 
                onPress={() => {
                  // First select weekends in the edit row
                  const weekendIndices = [0, 6]; // Sun, Sat
                  setActiveDays(weekendIndices.filter(idx => selectedDays[idx]));
                }}
              >
                <Ionicons name="game-controller" size={14} color="#fff" style={styles.smallPresetIcon} />
                <Text style={styles.smallPresetText}>Edit Weekends</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.smallPresetButton} 
                onPress={() => {
                  // Select all enabled days
                  setActiveDays(selectedDays.map((isSelected, idx) => isSelected ? idx : -1).filter(idx => idx !== -1));
                }}
              >
                <Ionicons name="calendar" size={14} color="#fff" style={styles.smallPresetIcon} />
                <Text style={styles.smallPresetText}>Edit All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual Sleep Schedule Section - Now for the active day */}
          <View style={styles.sleepScheduleCard}>
            <Text style={styles.activeDayHeader}>
              {activeDays.length === 0 
                ? "Select days to edit" 
                : activeDays.length === 1 
                  ? `Setting for ${dayNames[activeDays[0]]}` 
                  : `Setting for ${activeDays.length} days`}
            </Text>
            
            <View style={styles.iconRow}>
              <View style={styles.timeColumn}>
                <Ionicons name="moon" size={28} color="#8e8eff" style={styles.icon} />
                <Text style={styles.timeButtonLabel}>Bedtime:</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openTimePicker(true)}
                >
                  <View style={styles.timePicker}>
                    <Text style={styles.timeText}>
                      {activeDays.length > 0 ? formatTime(sleepTimes[activeDays[0]].bedTime) : "--:--"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" style={{marginLeft: 8}} />
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={24} color="#666" />
              </View>
              
              <View style={styles.timeColumn}>
                <Ionicons name="sunny" size={28} color="#ffb347" style={styles.icon} />
                <Text style={styles.timeButtonLabel}>Wake time:</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openTimePicker(false)}
                >
                  <View style={styles.timePicker}>
                    <Text style={styles.timeText}>
                      {activeDays.length > 0 ? formatTime(sleepTimes[activeDays[0]].wakeTime) : "--:--"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" style={{marginLeft: 8}} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.helpText}>
              {selectedDays[activeDays[0]] 
                ? "Set your sleep and wake up times for this day." 
                : "This day is disabled. Tap its button above to enable it."}
            </Text>
          </View>

          {/* Add this after the sleepScheduleCard view */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={22} color="#0A84FF" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                When you tap a time, you can scroll through hours and minutes to set your preferred time.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="moon-outline" size={22} color="#0A84FF" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                During your set sleep hours, you'll get reminders to disconnect if you're still using your phone.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={22} color="#0A84FF" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Use "All Weekdays" for Monday-Friday (e.g., 10PM-6AM) and "Weekends" for Saturday-Sunday (e.g., 12AM-8AM).
              </Text>
            </View>
          </View>

          {/* Add a test button to your UI */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={testBedtimeNotification}
          >
            <Text style={styles.testButtonText}>Test Bedtime Notification</Text>
          </TouchableOpacity>

          {/* Add a button to your notification UI */}
          <TouchableOpacity onPress={openNetworkSettings}>
            <Text>Open Network Settings</Text>
          </TouchableOpacity>

          {/* Add a test button to test sound */}
          <TouchableOpacity onPress={testSound}>
            <Text>Test Sound</Text>
          </TouchableOpacity>

          {/* Add this button to your UI */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              const isConnected = await checkConnectivity();
              Alert.alert(
                'Connectivity Test',
                isConnected ? 'Connected to the internet' : 'Not connected to the internet'
              );
            }}
          >
            <Text style={styles.testButtonText}>Test Connectivity</Text>
          </TouchableOpacity>

          {/* Add this button to your UI */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => startRecurringNotifications(15)} // 15 minutes interval
          >
            <Text style={styles.testButtonText}>Test Recurring Notifications</Text>
          </TouchableOpacity>

          {/* Add this to your UI */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              const now = new Date();
              const currentDay = now.getDay();
              
              const sleepSettingsJson = await AsyncStorage.getItem('sleepSettings');
              if (sleepSettingsJson) {
                const settings = JSON.parse(sleepSettingsJson);
                
                if (settings.enabled && settings.days && settings.days[currentDay]) {
                  const bedTimeObj = new Date(settings.sleepTimes[currentDay].bedTime);
                  const wakeTimeObj = new Date(settings.sleepTimes[currentDay].wakeTime);
                  
                  const bedTimeFormatted = formatTime(bedTimeObj);
                  const wakeTimeFormatted = formatTime(wakeTimeObj);
                  
                  Alert.alert(
                    'Today\'s Sleep Schedule',
                    `Today (${dayNames[currentDay]}) is enabled for sleep time.\n\nBedtime: ${bedTimeFormatted}\nWake time: ${wakeTimeFormatted}`
                  );
                } else {
                  Alert.alert(
                    'Sleep Not Scheduled',
                    `Today (${dayNames[currentDay]}) is not scheduled for sleep time monitoring.`
                  );
                }
              } else {
                Alert.alert('No sleep settings found');
              }
            }}
          >
            <Text style={styles.testButtonText}>Check Today's Schedule</Text>
          </TouchableOpacity>

          {/* Add this button to your UI for immediate testing */}
          <TouchableOpacity 
            style={[styles.testButton, {backgroundColor: '#ff6b6b'}]}
            onPress={async () => {
              const result = await checkIfBedtime();
              if (!result) {
                Alert.alert(
                  'Bedtime Check Failed',
                  'The system doesn\'t think it\'s bedtime right now. Check your settings and connectivity.'
                );
              }
            }}
          >
            <Text style={styles.testButtonText}>Force Bedtime Check Now</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.disabledMessage}>
          <Text style={styles.disabledText}>Sleep time is disabled.</Text>
          <Text style={styles.disabledSubtext}>Toggle the switch above to set up your sleep schedule.</Text>
        </View>
      )}

      {/* Make sure you have this modal in your UI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timeModalVisible}
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBedTime ? 'Set Bedtime' : 'Set Wake Time'}
            </Text>
            
            <DateTimePicker
              value={tempSelectedTime}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempSelectedTime(selectedDate);
                }
              }}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setTimeModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveButton]} 
                onPress={saveSelectedTime}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  daySelectionContainer: {
    marginBottom: 10,
  },
  compactLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  selectedDay: {
    backgroundColor: '#0A84FF',
  },
  dayText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedDayText: {
    fontWeight: 'bold',
  },
  disabledDay: {
    backgroundColor: '#1c1c1e',
    borderColor: '#ff6b6b',
    borderWidth: 1,
  },
  disabledDayText: {
    color: '#999',
  },
  disabledIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  editDayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  activeEditDay: {
    borderWidth: 2,
    borderColor: '#FFC107',
    backgroundColor: '#2a2a2a',
  },
  activeEditDayText: {
    fontWeight: 'bold',
    color: '#FFC107',
  },
  disabledEditDay: {
    opacity: 0.5,
  },
  sleepScheduleCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  activeDayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  timeColumn: {
    alignItems: 'center',
    flex: 2,
  },
  arrowContainer: {
    flex: 1,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  timeButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timePickerButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 5,
    minWidth: 110,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  quickPresetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 5,
  },
  smallPresetButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  smallPresetIcon: {
    marginRight: 6,
  },
  smallPresetText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    color: '#ddd',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  modalSaveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  timeButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disabledText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  disabledSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  prominentSaveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    marginHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  prominentSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 