import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Platform,
  Linking,
  Alert,
  NativeModules,
  TextInput,
  Modal
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

const { ScreenTimeBridge, SleepNotificationModule } = NativeModules;

// Define the app block schedule type
interface AppBlockSchedule {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  daysOfWeek: boolean[];
  isActive: boolean;
  blockedApps: string[];
  blockedCategories: string[];
  blockedWebDomains: string[];
  snoozeUntil?: string;
}

export default function AppBlockScreen() {
  const [schedules, setSchedules] = useState<AppBlockSchedule[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<AppBlockSchedule | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [hasScreenTimeAccess, setHasScreenTimeAccess] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [isSnoozeActive, setIsSnoozeActive] = useState(false);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const [snoozeTimeLeft, setSnoozeTimeLeft] = useState('');
  const snoozeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [endableSchedules, setEndableSchedules] = useState<string[]>([]);
  const isFocused = useIsFocused();
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPastEndTimeState, setIsPastEndTimeState] = useState(false);
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Function to check if there's an active snooze
  const checkSnoozeStatus = async () => {
    try {
      // Get all schedules
      const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
      if (!savedSchedules) return;
      
      const parsedSchedules = JSON.parse(savedSchedules);
      
      // Check if any schedule has a snoozeUntil property
      let anySnoozeActive = false;
      let latestSnoozeEndTime: Date | null = null;
      
      for (const schedule of parsedSchedules) {
        if (schedule.snoozeUntil) {
          const snoozeEndTime = new Date(schedule.snoozeUntil);
          const now = new Date();
          
          if (snoozeEndTime > now) {
            // This schedule is snoozed
            anySnoozeActive = true;
            
            // Keep track of the latest snooze end time
            if (!latestSnoozeEndTime || snoozeEndTime > latestSnoozeEndTime) {
              latestSnoozeEndTime = snoozeEndTime;
            }
          } else {
            // Snooze expired, remove it from this schedule
            schedule.snoozeUntil = null;
          }
        }
      }
      
      // Update the UI based on snooze status
      setIsSnoozeActive(anySnoozeActive);
      setSnoozeEndTime(latestSnoozeEndTime);
      
      if (latestSnoozeEndTime) {
        updateSnoozeTimeLeft(latestSnoozeEndTime);
      } else {
        setSnoozeTimeLeft('');
      }
      
      // Save the updated schedules back to storage
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(parsedSchedules));
      
    } catch (error) {
      console.error('Error checking snooze status:', error);
    }
  };
  
  // Function to update the time left display
  const updateSnoozeTimeLeft = (endTime: Date) => {
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setIsSnoozeActive(false);
      setSnoozeTimeLeft('');
      return;
    }
    
    // Calculate hours, minutes, seconds
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    
    if (hours > 0) {
      setSnoozeTimeLeft(`${hours}h ${minutes}m`);
    } else {
      setSnoozeTimeLeft(`${minutes}m`);
    }
  };
  
  // Set up timer to update snooze countdown
  useEffect(() => {
    if (isSnoozeActive && snoozeEndTime) {
      // Update immediately
      updateSnoozeTimeLeft(snoozeEndTime);
      
      // Then set up interval to update every minute
      snoozeTimerRef.current = setInterval(() => {
        if (snoozeEndTime) {
          const now = new Date();
          if (snoozeEndTime <= now) {
            // Snooze is over
            setIsSnoozeActive(false);
            clearInterval(snoozeTimerRef.current as NodeJS.Timeout);
            snoozeTimerRef.current = null;
            checkSnoozeStatus(); // Recheck to clean up
          } else {
            updateSnoozeTimeLeft(snoozeEndTime);
          }
        }
      }, 60000); // Update every minute
    }
    
    return () => {
      if (snoozeTimerRef.current) {
        clearInterval(snoozeTimerRef.current);
        snoozeTimerRef.current = null;
      }
    };
  }, [isSnoozeActive, snoozeEndTime]);
  
  // Add this function to check for schedules that need the End Block button
  const checkScheduleEndTimes = () => {
    console.log("🔍 Immediately checking schedule end times");
    
    // Force a re-render to update the UI immediately
    setRefreshTrigger(prev => prev + 1);
    
    // Set up a timer to check again in 1 second
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    
    checkTimerRef.current = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1000);
  };
  
  // Update the useFocusEffect to run the check immediately when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadSchedules = async () => {
        try {
          console.log("🔄 Reloading schedules from storage");
          const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
          if (savedSchedules) {
            const parsed = JSON.parse(savedSchedules);
            // Convert string dates back to Date objects AND ensure all arrays exist
            const schedules = parsed.map((schedule: AppBlockSchedule) => {
              // Ensure endTime is a proper Date object
              const endTime = new Date(schedule.endTime);
              
              return {
                ...schedule,
                startTime: new Date(schedule.startTime),
                endTime: endTime,
                // Ensure these arrays exist
                blockedApps: Array.isArray(schedule.blockedApps) ? schedule.blockedApps : [],
                blockedWebDomains: Array.isArray(schedule.blockedWebDomains) ? schedule.blockedWebDomains : [],
                blockedCategories: Array.isArray(schedule.blockedCategories) ? schedule.blockedCategories : []
              };
            });
            
            console.log("Loaded schedules with dates:", schedules.map((s: AppBlockSchedule) => ({
              id: s.id,
              endTime: s.endTime.toLocaleString()
            })));
            
            setSchedules(schedules);
            
            // IMMEDIATELY check for schedules that need the End Block button
            setTimeout(checkScheduleEndTimes, 100);
          } else {
            // If no schedules, set empty array
            setSchedules([]);
          }
        } catch (error) {
          console.error('Error loading app block schedules:', error);
        }
      };
      
      // Add this function to load reminder settings
      const loadReminderSettings = async () => {
        try {
          const reminderEnabled = await AsyncStorage.getItem('sleepReminderEnabled');
          const reminderTimeStr = await AsyncStorage.getItem('sleepReminderTime');
          
          if (reminderEnabled === 'true') {
            setIsReminderEnabled(true);
          }
          
          if (reminderTimeStr) {
            setReminderTime(new Date(reminderTimeStr));
          }
        } catch (error) {
          console.error('Error loading reminder settings:', error);
        }
      };
      
      loadSchedules();
      loadReminderSettings();
      checkSnoozeStatus();
      
      // Run the check again after a short delay to ensure everything is loaded
      const immediateCheck = setTimeout(checkScheduleEndTimes, 500);
      
      return () => {
        clearTimeout(immediateCheck);
      };
    }, [])
  );
  
  // Save schedules when they change
  useEffect(() => {
    const saveSchedules = async () => {
      try {
        await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(schedules));
      } catch (error) {
        console.error('Error saving app block schedules:', error);
      }
    };
    
    if (schedules.length > 0) {
      saveSchedules();
    }
  }, [schedules]);
  
  // Update the useEffect that calls requestScreenTimeAccess
  useEffect(() => {
    // Add a small delay to ensure the app is fully mounted
    const timer = setTimeout(() => {
      requestScreenTimeAccess();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to request Screen Time access with better error handling
  const requestScreenTimeAccess = async () => {
    try {
      setIsCheckingPermissions(true);
      if (Platform.OS === 'ios') {
        // Use the Swift bridge to request authorization
        if (ScreenTimeBridge) {
          const result = await ScreenTimeBridge.requestAuthorization();
          
          // Check if result is a boolean (success) or an object (error details)
          if (typeof result === 'boolean') {
            setHasScreenTimeAccess(result);
            setPasscodeRequired(false);
          } else if (typeof result === 'object') {
            // Handle structured error response
            setHasScreenTimeAccess(false);
            
            if (result.errorCode === 'passcode_required' || 
                (result.error && result.error.includes('passcode'))) {
              setPasscodeRequired(true);
              Alert.alert(
                'Passcode Required',
                'Screen Time requires a device passcode. You must set up a passcode in your device settings before you can use app blocking features.',
                [
                  {
                    text: 'Open Settings',
                    onPress: () => Linking.openURL('App-prefs:PASSCODE')
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  }
                ]
              );
            } else if (result.error && result.error.includes('available for only one application')) {
              Alert.alert(
                'Screen Time In Use',
                'Screen Time is currently being used by another app. Please close any other apps that might be using Screen Time and try again.',
                [{ text: 'OK' }]
              );
            } else if (result.error && result.error.includes('canceled')) {
              // User canceled - no need to show an alert
              console.log('User canceled Screen Time authorization');
            } else {
              Alert.alert(
                'Screen Time Access Required',
                'Please allow Screen Time access to use app blocking features.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      }
      setIsCheckingPermissions(false);
    } catch (error) {
      // This should now only catch unexpected errors
      console.error('Unexpected error in Screen Time access flow:', error);
      setIsCheckingPermissions(false);
    }
  };
  
  // Create a new schedule
  const createNewSchedule = () => {
    router.push('/appblock/edit?id=new');
  };
  
  // Edit an existing schedule
  const editSchedule = (index: number) => {
    const schedule = schedules[index];
    setCurrentSchedule(schedule);
    setEditIndex(index);
    
    // Check if the schedule is currently active
    if (isScheduleCurrentlyActive(schedule)) {
      // Store the schedule ID in AsyncStorage first
      AsyncStorage.setItem('currentBlockScheduleId', schedule.id)
        .then(() => {
          // Then navigate to breathe screen
          router.push('/breathe');
        })
        .catch(error => {
          console.error('Error storing schedule ID:', error);
          // Fall back to edit screen if there's an error
          router.push(`/appblock/edit?id=${schedule.id}`);
        });
    } else {
      // If not active, go to edit screen as before
      router.push(`/appblock/edit?id=${schedule.id}`);
    }
  };
  
  // Delete a schedule
  const deleteSchedule = (index: number) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newSchedules = [...schedules];
            newSchedules.splice(index, 1);
            setSchedules(newSchedules);
          }
        }
      ]
    );
  };
  
  // Toggle a day of the week
  const toggleDay = (dayIndex: number) => {
    if (currentSchedule) {
      const newDays = [...currentSchedule.daysOfWeek];
      newDays[dayIndex] = !newDays[dayIndex];
      setCurrentSchedule({...currentSchedule, daysOfWeek: newDays});
    }
  };
  
  // Toggle a schedule's active state
  const toggleSchedule = (index: number) => {
    const newSchedules = [...schedules];
    newSchedules[index].isActive = true; // Always set to active
    setSchedules(newSchedules);
    
    // Apply the schedule if it's now active
    applyAppBlockSchedule(newSchedules[index]);
  };
  
  // Add this function to apply the app blocking schedule
  const applyAppBlockSchedule = async (schedule: AppBlockSchedule) => {
    if (Platform.OS === 'ios') {
      try {
        console.log("🔒 Applying app block schedule from main screen");
        if (ScreenTimeBridge) {
          // Convert the schedule to a format that can be passed to Swift
          // Keep time fields in the data but they won't be used for blocking
          const scheduleData = {
            id: schedule.id,
            startTime: schedule.startTime.toISOString(),
            endTime: schedule.endTime.toISOString(),
            blockedApps: schedule.blockedApps,
            blockedCategories: schedule.blockedCategories,
            blockedWebDomains: schedule.blockedWebDomains,
            daysOfWeek: schedule.daysOfWeek,
            isActive: schedule.isActive
          };
          
          console.log("📤 Sending schedule data:", JSON.stringify(scheduleData));
          console.log("📱 Blocked apps count:", schedule.blockedApps.length);
          
          const result = await ScreenTimeBridge.applyAppBlockSchedule(scheduleData);
          console.log("📥 Result from native module:", result);
        } else {
          console.log("⚠️ ScreenTimeBridge not available");
        }
      } catch (error) {
        console.error('❌ Error applying app block schedule:', error);
      }
    }
  };
  
  // Update the saveSchedule function to apply the schedule
  const saveSchedule = async () => {
    if (currentSchedule) {
      const newSchedules = [...schedules];
      if (editIndex !== null) {
        newSchedules[editIndex] = currentSchedule;
      } else {
        newSchedules.push(currentSchedule);
      }
      setSchedules(newSchedules);
      setCurrentSchedule(null);
      setEditIndex(null);
      
      // Apply the schedule
      await applyAppBlockSchedule(currentSchedule);
    }
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setCurrentSchedule(null);
    setEditIndex(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };
  
  // Update the toggleScheduleActive function to apply the schedule
  const toggleScheduleActive = async (index: number) => {
    const newSchedules = [...schedules];
    newSchedules[index].isActive = !newSchedules[index].isActive;
    
    console.log(`🔄 Toggling schedule ${newSchedules[index].id} to ${newSchedules[index].isActive ? 'active' : 'inactive'}`);
    
    setSchedules(newSchedules);
    
    // Apply the updated schedule
    console.log("🔒 Applying updated schedule after toggle");
    await applyAppBlockSchedule(newSchedules[index]);
  };
  
  // Open Screen Time settings
  const openScreenTimeSettings = () => {
    if (Platform.OS === 'ios') {
      requestScreenTimeAccess();
    } else {
      // For Android, we can only guide users to Digital Wellbeing
      Linking.openSettings();
    }
  };
  
  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Show app selection screen
  const showAppSelectionScreen = () => {
    // Implementation of showing app selection screen
  };
  
  // Handle time picker changes
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate && currentSchedule) {
      if (showStartPicker) {
        setCurrentSchedule({...currentSchedule, startTime: selectedDate} as AppBlockSchedule);
      } else if (showEndPicker) {
        setCurrentSchedule({...currentSchedule, endTime: selectedDate} as AppBlockSchedule);
      }
    }
  };
  
  // Add this function to open the app selection picker
  const openAppSelectionPicker = async () => {
    if (Platform.OS === 'ios' && currentSchedule) {
      try {
        if (ScreenTimeBridge) {
          const selection = await ScreenTimeBridge.showAppSelectionPicker();
          
          // Update the current schedule with the selected apps
          if (selection && selection.apps) {
            setCurrentSchedule({
              ...currentSchedule,
              blockedApps: selection.apps,
              blockedCategories: selection.categories || [],
              blockedWebDomains: selection.webDomains || []
            });
          }
        }
      } catch (error) {
        console.error('Error showing app selection picker:', error);
      }
    }
  };
  
  // Add this function to apply all schedules
  const applyAllSchedules = async () => {
    for (const schedule of schedules) {
      if (schedule.isActive) {
        await applyAppBlockSchedule(schedule);
      }
    }
  };
  
  // Replace the entire registerSchedulesWithSystem function with this simplified version
  const registerSchedulesWithSystem = async () => {
    // Skip the background registration entirely since it's causing errors
    // and you don't need the 15-minute minimum requirement
    console.log("Skipping background registration due to short schedule duration");
    
    // Just apply the schedules directly without registering for background monitoring
    for (const schedule of schedules) {
      if (schedule.isActive && Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // Apply the schedule directly
          await applyAppBlockSchedule(schedule);
          console.log(`Applied schedule ${schedule.id} directly`);
        } catch (error) {
          console.error(`Error applying schedule ${schedule.id}:`, error);
        }
      }
    }
  };
  
  // Call this after applying schedules
  useEffect(() => {
    if (schedules.length > 0 && hasScreenTimeAccess) {
      applyAllSchedules().then(() => {
        // After applying schedules, register them with the system
        registerSchedulesWithSystem();
      });
    }
  }, [schedules, hasScreenTimeAccess]);
  
  // Function to check if a schedule is currently active
  const isScheduleCurrentlyActive = (schedule: AppBlockSchedule) => {
    // If the schedule is not active, return false
    if (!schedule.isActive) {
      return false;
    }
    
    // Check if we're past the end time
    const now = new Date();
    
    // Parse the end time and ensure it's a proper Date object
    const endTime = new Date(schedule.endTime);
    
    // Debug with full date and time
    console.log(`Schedule ${schedule.id}: now=${now.toLocaleString()}, end=${endTime.toLocaleString()}, isPastEndTime=${now >= endTime}`);
    
    // If current time is past the end time, suggest removing the block
    if (now >= endTime) {
      return false;
    }
    
    // Otherwise, the schedule is active
    return true;
  };
  
  // Function to format schedule time for display
  const formatScheduleTime = (schedule: AppBlockSchedule) => {
    // Only show when the block will end
    const endTime = new Date(schedule.endTime);
    return `End available at ${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  // Add this effect to check for schedules that can be ended
  useEffect(() => {
    // Function to check which schedules can be ended
    const checkEndableSchedules = () => {
      const now = new Date();
      const endable: string[] = [];
      
      schedules.forEach(schedule => {
        if (schedule.isActive) {
          const endTime = new Date(schedule.endTime);
          // Check if current time is at or past end time
          if (now >= endTime) {
            endable.push(schedule.id);
          }
        }
      });
      
      setEndableSchedules(endable);
    };
    
    // Check immediately when the component mounts or when schedules change
    checkEndableSchedules();
    
    // Set up a timer to check every minute
    checkTimerRef.current = setInterval(checkEndableSchedules, 60000);
    
    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [schedules, isFocused]);
  
  // Remove the 10-second refresh timer
  useEffect(() => {
    // Function to check if any schedules need the End Block button
    const checkScheduleTimes = () => {
      const now = new Date();
      // Force a re-render to update the UI
      setRefreshTrigger(prev => prev + 1);
    };
    
    // Check immediately
    checkScheduleTimes();
    
    // Set up an interval to check every 1 second (1000ms)
    const intervalId = setInterval(checkScheduleTimes, 1000);
    
    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // First, let's add a new function to determine if a schedule is active
  const isScheduleActive = (schedule: AppBlockSchedule) => {
    // Always consider it active if isActive is true
    return schedule.isActive === true;
  };
  
  // Function to check if current time is truly past the end time
  const isPastEndTime = (schedule: AppBlockSchedule) => {
    // If the schedule is not active, it's considered past end time
    if (!schedule.isActive) return true;
    
    const now = new Date();
    const endTime = new Date(schedule.endTime);
    
    // Debug with full date and time
    console.log(`Schedule ${schedule.id}: now=${now.toLocaleString()}, end=${endTime.toLocaleString()}, isPastEndTime=${now.getTime() > endTime.getTime()}`);
    
    // Simple millisecond-precise comparison
    return now.getTime() > endTime.getTime();
  };
  
  // Update the renderScheduleCard function to be more precise
  const renderScheduleCard = (schedule: AppBlockSchedule, index: number) => {
    let statusBadge = null;
    const now = new Date();

    if (schedule.snoozeUntil && new Date(schedule.snoozeUntil) > now) {
      // This specific schedule is snoozed
      statusBadge = (
        <View style={[styles.statusBadge, styles.statusBadgeSnoozed]}>
          <Text style={styles.statusBadgeText}>Snoozed</Text>
        </View>
      );
    } else if (schedule.isActive) {
      statusBadge = (
        <View style={[styles.statusBadge, styles.statusBadgeActive]}>
          <Text style={styles.statusBadgeText}>Active</Text>
        </View>
      );
    } else {
      statusBadge = (
        <View style={[styles.statusBadge, styles.statusBadgeEnded]}>
          <Text style={styles.statusBadgeText}>Disabled</Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        key={schedule.id}
        style={styles.scheduleCard}
        onPress={() => editSchedule(index)}
      >
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleNameContainer}>
            <Text style={styles.scheduleName}>{schedule.name}</Text>
            {statusBadge}
          </View>
        </View>
        
        <View style={styles.scheduleDetails}>
          <View style={styles.scheduleInfo}>
            <Ionicons name="apps" size={18} color="#8E8E93" />
            <Text style={styles.scheduleInfoText}>
              {schedule.blockedApps && schedule.blockedApps.length > 0 
                ? `${schedule.blockedApps.length} app${schedule.blockedApps.length !== 1 ? 's' : ''}` 
                : "No apps"} 
              {schedule.blockedWebDomains && schedule.blockedWebDomains.length > 0 
                ? `, ${schedule.blockedWebDomains.length} website${schedule.blockedWebDomains.length !== 1 ? 's' : ''}` 
                : ""}
              {schedule.blockedCategories && schedule.blockedCategories.length > 0 
                ? `, ${schedule.blockedCategories.length} categor${schedule.blockedCategories.length !== 1 ? 'ies' : 'y'}` 
                : ""}
            </Text>
          </View>
          
          {/* Always show the time, regardless of active status */}
          <View style={styles.scheduleTimeRow}>
            <Ionicons name="time-outline" size={18} color="#0A84FF" style={styles.timeIcon} />
            <Text style={styles.timeText}>
              End available at {schedule.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
          
          {/* Show End Block button only when schedule is active AND truly past adjusted end time */}
          {schedule.isActive && isPastEndTime(schedule) && (
            <TouchableOpacity 
              style={styles.endBlockButton}
              onPress={() => handleEndBlock(schedule.id)}
            >
              <Ionicons name="stop-circle-outline" size={18} color="#FF453A" />
              <Text style={styles.endBlockText}>End Block</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Add this function to your AppBlockScreen component
  const addSleepReminder = () => {
    // Navigate to new alarm screen with sleep reminder preset
    router.push({
      pathname: '/new-alarm',
      params: { 
        preset: 'sleep-reminder',
        hour: '22', // 10:00 PM default
        minute: '00',
        label: 'Sleep Reminder'
      }
    });
  };
  
  const openTimePicker = () => {
    setShowTimeModal(true);
  };
  
  const saveTime = async () => {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notifications permission is required.');
        return;
      }
      
      // Use our native module directly with simplified parameters
      await SleepNotificationModule.scheduleSleepReminder(
        reminderTime.getHours(),
        reminderTime.getMinutes()
      );
      
      // Update UI state
      setShowTimeModal(false);
      setIsReminderEnabled(true);
      
      // Save settings to AsyncStorage
      await AsyncStorage.setItem('sleepReminderEnabled', 'true');
      await AsyncStorage.setItem('sleepReminderTime', reminderTime.toISOString());
      
      // Confirm to user
      Alert.alert(
        'Reminder Set',
        `Sleep reminder set for ${reminderTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} daily.`
      );
    } catch (error) {
      console.error('Error setting reminder:', error);
      Alert.alert('Error', 'Failed to set reminder. Please try again.');
    }
  };
  
  const toggleReminder = async (value: boolean) => {
    setIsReminderEnabled(value);
    
    if (!value) {
      // Cancel notification using our Swift module
      try {
        await SleepNotificationModule.cancelSleepReminder();
        await AsyncStorage.setItem('sleepReminderEnabled', 'false');
        Alert.alert('Reminder Disabled', 'Your sleep reminder has been turned off');
      } catch (error) {
        console.error('Error canceling notification:', error);
      }
    } else if (!showTimeModal) {
      // If enabling, open the time picker
      openTimePicker();
    }
  };
  
  // Modify the handleSnooze function to store snooze per schedule
  const handleSnooze = async (scheduleId: string, minutes: number) => {
    try {
      // Get all schedules
      const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
      if (!savedSchedules) return;
      
      const parsedSchedules = JSON.parse(savedSchedules);
      
      // Find the specific schedule
      const scheduleIndex = parsedSchedules.findIndex((s: any) => s.id === scheduleId);
      if (scheduleIndex === -1) return;
      
      // Set snooze end time
      const now = new Date();
      const snoozeEndTime = new Date(now.getTime() + minutes * 60 * 1000);
      
      // Add snoozeUntil property to this specific schedule
      parsedSchedules[scheduleIndex].snoozeUntil = snoozeEndTime.toISOString();
      
      // Save updated schedules
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(parsedSchedules));
      
      // If on iOS, stop monitoring for this specific schedule temporarily
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, minutes);
          console.log("Monitoring paused for schedule:", scheduleId);
        } catch (error) {
          console.error("Error pausing monitoring:", error);
        }
      }
      
      // Update UI
      checkSnoozeStatus();
      
      // Navigate to snooze screen
      router.push({
        pathname: '/snooze-sleep',
        params: { minutes, scheduleId }
      });
    } catch (error) {
      console.error('Error snoozing schedule:', error);
    }
  };
  
  // Modify the handleEndSnooze function to avoid reloading schedules
  const handleEndSnooze = async () => {
    try {
      // Get all schedules
      const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
      if (!savedSchedules) return;
      
      const parsedSchedules = JSON.parse(savedSchedules);
      
      // Remove snoozeUntil from all schedules
      for (const schedule of parsedSchedules) {
        if (schedule.snoozeUntil) {
          schedule.snoozeUntil = null;
        }
      }
      
      // Save updated schedules
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(parsedSchedules));
      
      // Clear global snooze state (for backward compatibility)
      await AsyncStorage.removeItem('appBlockDisabledUntil');
      
      // Update UI
      setIsSnoozeActive(false);
      setSnoozeEndTime(null);
      setSnoozeTimeLeft('');
      
      // Update the schedules state directly instead of reloading
      setSchedules(parsedSchedules);
      
      // If on iOS, resume monitoring for all schedules
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // This will reapply all active schedules
          applyAllSchedules();
        } catch (error) {
          console.error("Error resuming monitoring:", error);
        }
      }
    } catch (error) {
      console.error('Error ending snooze:', error);
    }
  };
  
  // Update the handleEndBlock function to completely destroy the block
  const handleEndBlock = async (scheduleId: string) => {
    try {
      console.log(`🔥 DESTROYING block for schedule: ${scheduleId}`);
      
      // If on iOS, use ScreenTimeBridge to completely stop monitoring
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // First, remove all shields immediately
          await ScreenTimeBridge.removeAllShields();
          console.log('🛡️ All shields removed');
          
          // Then stop monitoring for this schedule
          await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, 0);
          console.log('🔥 Successfully stopped monitoring');
          
          // Update the UI to show the block is completely inactive
          const updatedSchedules = schedules.map(s => {
            if (s.id === scheduleId) {
              return {
                ...s,
                isActive: false,
                // Set end time to now to ensure it's considered past
                endTime: new Date()
              };
            }
            return s;
          });
          
          // Update state and save to AsyncStorage
          setSchedules(updatedSchedules);
          await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(updatedSchedules));
          
          // Show confirmation to user
          Alert.alert('Block Destroyed', 'App blocking has been completely deactivated.');
        } catch (error) {
          console.error('💥 Error destroying block:', error);
          Alert.alert('Error', 'Failed to destroy block. Please try again.');
        }
      }
    } catch (error) {
      console.error('💥 Error handling destroy block:', error);
      Alert.alert('Error', 'Failed to destroy block. Please try again.');
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'App Blocking',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: '600',
          },
          headerTintColor: '#fff',
        }} 
      />
      
      <View style={styles.container}>
        {/* Sleep Reminder Card - TOP POSITION */}
        <View style={styles.sleepReminderCard}>
          <View style={styles.sleepReminderHeader}>
            <View style={styles.reminderTitleContainer}>
              <Ionicons name="bed-outline" size={24} color="#0A84FF" />
              <Text style={styles.sleepReminderTitle}>Sleep Reminder</Text>
            </View>
            <Switch
              value={isReminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{ false: '#3A3A3C', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          {isReminderEnabled && (
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={openTimePicker}
            >
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              <Text style={styles.sleepTimeText}>
                {reminderTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
          
          {/* Time Picker Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showTimeModal}
            onRequestClose={() => setShowTimeModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimeModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Set Sleep Time</Text>
                  <TouchableOpacity
                    onPress={saveTime}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) setReminderTime(selectedDate);
                    }}
                    style={styles.sleepTimePicker}
                    textColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>
          </Modal>
        </View>
        
        {/* Instructions - Only show when we know permissions are missing */}
        {!hasScreenTimeAccess && !isCheckingPermissions && (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Focus Time</Text>
            <Text style={styles.instructionText}>
              Create schedules to block distracting apps and stay focused.
              Bliss uses Screen Time to help you maintain your digital wellbeing.
            </Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openScreenTimeSettings}
            >
              <Text style={styles.settingsButtonText}>Set Up Screen Time</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Schedules List */}
        <ScrollView style={styles.schedulesList}>
          {schedules.map((schedule, index) => renderScheduleCard(schedule, index))}
        </ScrollView>
        
        {/* Add New Schedule Button - Only show if no schedules exist */}
        {schedules.length === 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={createNewSchedule}
          >
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={styles.addButtonText}>New Sleep Time</Text>
          </TouchableOpacity>
        )}
        
        {/* Time Pickers */}
        {(showStartPicker || showEndPicker) && (
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={() => {
                setShowStartPicker(false);
                setShowEndPicker(false);
              }}>
                <Text style={styles.timePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>
                {showStartPicker ? 'Select Start Time' : 'Select End Time'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (showStartPicker) {
                  setShowStartPicker(false);
                } else {
                  setShowEndPicker(false);
                }
              }}>
                <Text style={styles.timePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={showStartPicker ? currentSchedule?.startTime || new Date() : currentSchedule?.endTime || new Date()}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={onTimeChange}
              style={styles.sleepTimePicker}
              textColor="#FFFFFF"
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  instructionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  instructionText: {
    fontSize: 15,
    color: '#999',
    marginBottom: 20,
    lineHeight: 22,
  },
  settingsButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  schedulesList: {
    flex: 1,
    marginBottom: 80,
  },
  scheduleCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIndicator: {
    marginRight: 10,
  },
  activeIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeIndicatorDotOn: {
    backgroundColor: '#34C759',
  },
  activeIndicatorDotOff: {
    backgroundColor: '#8E8E93',
  },
  activeIndicatorDotSnoozed: {
    backgroundColor: '#0A84FF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeIndicatorDotScheduled: {
    backgroundColor: '#FF9500', // Orange color for scheduled but not active
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scheduleDetails: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleInfoText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  scheduleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  scheduleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 16,
  },
  scheduleActionText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  timePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  timePickerCancel: {
    fontSize: 16,
    color: '#FF453A',
  },
  timePickerDone: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: 'bold',
  },
  sleepTimePicker: {
    height: 200,
    width: '100%',
  },
  snoozeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  snoozeInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snoozeInfoText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
  snoozeEndButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  snoozeEndButtonText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  statusBadgeSnoozed: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  statusBadgeScheduled: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)', // Orange background for scheduled
  },
  statusBadgeEnded: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  sleepReminderCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sleepReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepReminderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'space-between',
  },
  sleepTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',
  },
  pickerContainer: {
    paddingVertical: 20,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  timeIcon: {
    marginRight: 8,
    color: '#0A84FF',
  },
  timeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  removeBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  removeBlockText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  endBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  endBlockText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  createButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 