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
  TextInput
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

const { ScreenTimeBridge } = NativeModules;

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
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Function to check if there's an active snooze
  const checkSnoozeStatus = async () => {
    try {
      const snoozeUntil = await AsyncStorage.getItem('appBlockDisabledUntil');
      
      if (snoozeUntil) {
        const endTime = new Date(snoozeUntil);
        const now = new Date();
        
        // If the snooze end time is in the future
        if (endTime > now) {
          setIsSnoozeActive(true);
          setSnoozeEndTime(endTime);
          updateSnoozeTimeLeft(endTime);
        } else {
          // Snooze expired
          setIsSnoozeActive(false);
          setSnoozeEndTime(null);
          setSnoozeTimeLeft('');
          
          // Clean up the expired snooze
          await AsyncStorage.removeItem('appBlockDisabledUntil');
        }
      } else {
        setIsSnoozeActive(false);
        setSnoozeEndTime(null);
        setSnoozeTimeLeft('');
      }
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
  
  // Load schedules whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadSchedules = async () => {
        try {
          console.log("🔄 Reloading schedules from storage");
          const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
          if (savedSchedules) {
            const parsed = JSON.parse(savedSchedules);
            // Convert string dates back to Date objects
            const schedules = parsed.map((schedule: any) => ({
              ...schedule,
              startTime: new Date(schedule.startTime),
              endTime: new Date(schedule.endTime)
            }));
            setSchedules(schedules);
          } else {
            // If no schedules, set empty array
            setSchedules([]);
          }
        } catch (error) {
          console.error('Error loading app block schedules:', error);
        }
      };
      
      loadSchedules();
      checkSnoozeStatus();
      
      // No cleanup needed
      return () => {};
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
  
  // Add a function to apply all schedules
  const applyAllSchedules = async () => {
    for (const schedule of schedules) {
      await applyAppBlockSchedule(schedule);
    }
  };
  
  // Apply all schedules when the app loads
  useEffect(() => {
    if (schedules.length > 0 && hasScreenTimeAccess) {
      applyAllSchedules();
    }
  }, [schedules, hasScreenTimeAccess]);
  
  // Function to check if a schedule is currently active based on time
  const isScheduleCurrentlyActive = (schedule: AppBlockSchedule) => {
    // If the schedule is not set to active, it's definitely not active
    if (!schedule.isActive) return false;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if today is a day when this schedule is active
    if (!schedule.daysOfWeek[currentDay]) return false;
    
    // Get current hour and minute
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeAsMinutes = currentHour * 60 + currentMinute;
    
    // Get schedule start and end times
    const startHour = schedule.startTime.getHours();
    const startMinute = schedule.startTime.getMinutes();
    const startTimeAsMinutes = startHour * 60 + startMinute;
    
    const endHour = schedule.endTime.getHours();
    const endMinute = schedule.endTime.getMinutes();
    const endTimeAsMinutes = endHour * 60 + endMinute;
    
    // Check if current time is within schedule time range
    // Handle both normal ranges and overnight ranges
    if (startTimeAsMinutes <= endTimeAsMinutes) {
      // Normal time range (e.g., 9:00 - 17:00)
      return currentTimeAsMinutes >= startTimeAsMinutes && currentTimeAsMinutes <= endTimeAsMinutes;
    } else {
      // Overnight time range (e.g., 22:00 - 7:00)
      return currentTimeAsMinutes >= startTimeAsMinutes || currentTimeAsMinutes <= endTimeAsMinutes;
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
          {schedules.map((schedule, index) => {
            const isCurrentlyActive = isScheduleCurrentlyActive(schedule);
            
            return (
              <TouchableOpacity 
                key={schedule.id}
                style={styles.scheduleCard}
                onPress={() => editSchedule(index)}
              >
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleNameContainer}>
                    <View style={styles.activeIndicator}>
                      <View style={[
                        styles.activeIndicatorDot,
                        isSnoozeActive ? styles.activeIndicatorDotSnoozed : 
                        isCurrentlyActive ? styles.activeIndicatorDotOn : 
                        schedule.isActive ? styles.activeIndicatorDotScheduled : styles.activeIndicatorDotOff
                      ]} />
                    </View>
                    <Text style={styles.scheduleName}>{schedule.name || 'Focus Time'}</Text>
                  </View>
                  
                  {/* Status Badge */}
                  {(schedule.isActive) && (
                    <View style={[
                      styles.statusBadge,
                      isSnoozeActive ? styles.statusBadgeSnoozed : 
                      isCurrentlyActive ? styles.statusBadgeActive : styles.statusBadgeScheduled
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {isSnoozeActive ? 'Snoozed' : isCurrentlyActive ? 'Active' : 'Scheduled'}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Snooze Info (only show if both snoozed and the schedule would be active now) */}
                {isSnoozeActive && isCurrentlyActive && (
                  <View style={styles.snoozeInfoContainer}>
                    <View style={styles.snoozeInfoContent}>
                      <Ionicons name="time-outline" size={16} color="#0A84FF" style={{marginRight: 8}} />
                      <Text style={styles.snoozeInfoText}>
                        Paused · Resuming in {snoozeTimeLeft}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.snoozeEndButton}
                      onPress={async () => {
                        await AsyncStorage.removeItem('appBlockDisabledUntil');
                        setIsSnoozeActive(false);
                        checkSnoozeStatus();
                      }}
                    >
                      <Text style={styles.snoozeEndButtonText}>End</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.scheduleDetails}>
                  <View style={styles.scheduleTimeRow}>
                    <Ionicons name="time-outline" size={18} color="#0A84FF" style={styles.timeIcon} />
                    <Text style={styles.timeText}>
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.daysList}>
                    {schedule.daysOfWeek.map((isActive, dayIndex) => (
                      <View 
                        key={dayIndex} 
                        style={[
                          styles.dayBubble,
                          isActive ? styles.selectedDay : styles.unselectedDay
                        ]}
                      >
                        <Text 
                          style={[
                            styles.dayText,
                            isActive ? styles.selectedDayText : styles.unselectedDayText
                          ]}
                        >
                          {daysOfWeek[dayIndex][0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {schedule.blockedApps.length > 0 && (
                    <View style={styles.appsContainer}>
                      <View style={styles.appsHeader}>
                        <Ionicons name="apps" size={18} color="#0A84FF" />
                        <Text style={styles.appsHeaderText}>
                          {schedule.blockedApps.length} apps blocked
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Add New Schedule Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={createNewSchedule}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addButtonText}>New Sleep Time</Text>
        </TouchableOpacity>
        
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
              style={styles.timePicker}
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
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeIcon: {
    marginRight: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#fff',
  },
  daysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedDay: {
    backgroundColor: '#0A84FF',
  },
  unselectedDay: {
    backgroundColor: '#3A3A3C',
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#fff',
  },
  unselectedDayText: {
    color: '#8E8E93',
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
  timePicker: {
    height: 200,
    width: '100%',
  },
  appsContainer: {
    marginTop: 12,
  },
  appsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appsHeaderText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
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
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
}); 