import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Linking, Platform, Switch } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { AlarmItem } from '@/components/AlarmItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scheduleAlarmNotification, cancelAlarmNotification, requestNotificationPermissions } from '../notifications';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define the Alarm type
interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
  days: string[];
  label: string;
  mission: {
    id: string;
    name: string;
    icon: string;
    type?: string;
  } | null;
  sound: string;
  volume: number;
  vibration: boolean;
  soundVolume: number;
}

// Update the time display logic
const calculateTimeUntilAlarm = (alarm: Alarm | null): string => {
  if (!alarm) return 'No alarms set';
  
  // Get current date and time
  const now = new Date();
  const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Parse alarm time
  const [hours, minutes] = alarm.time.split(':').map(Number);
  
  // Create a date object for the alarm time today
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  // If alarm is for today and in the future
  if (alarm.days.includes(today.toString()) && alarmTime > now) {
    // Format time only (e.g., "8:30 AM")
    return `Alarm at ${formatTime(alarm.time)}`;
  }
  
  // For alarms on other days, show the day name only
  const nextDay = getNextAlarmDay(alarm.days, today);
  if (nextDay !== null) {
    const dayName = getDayName(nextDay);
    return `Alarm on ${dayName}`;
  }
  
  return 'No upcoming alarms';
};

// Update this helper function at the top of your file
const getDayName = (day: string | number): string => {
  // Convert to string if it's a number
  const dayStr = day.toString();
  
  // Ensure we're using the correct mapping (1=Monday, 7=Sunday)
  const dayMap: Record<string, string> = {
    '1': 'Mon',
    '2': 'Tue',
    '3': 'Wed',
    '4': 'Thu',
    '5': 'Fri',
    '6': 'Sat',
    '7': 'Sun',
    // Also handle JavaScript day numbers (0=Sunday, 1=Monday)
    '0': 'Sun'
  };
  return dayMap[dayStr] || '';
};

// Add this helper function at the top of your file
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Add this helper function to find the next alarm day
const getNextAlarmDay = (days: string[], today: number): number | null => {
  if (!days || days.length === 0) return null;
  
  // Convert days to numbers
  const numericDays = days.map(day => parseInt(day));
  
  // First try to find a day later this week
  for (let i = today + 1; i <= 7; i++) {
    if (numericDays.includes(i)) return i;
  }
  
  // If not found, wrap around to the beginning of the week
  for (let i = 1; i <= today; i++) {
    if (numericDays.includes(i)) return i;
  }
  
  // Handle Sunday (0 in JavaScript)
  if (numericDays.includes(0)) return 0;
  
  return null;
};

interface AlarmItemProps {
  alarm: {
    id: string;
    time: string;
    enabled: boolean;
    days: string[];
    label: string;
    mission: {
      id?: string;
      name: string;
      icon?: string;
      type?: string;
    } | string | null;
    sound: string;
    volume: number;
    vibration: boolean;
    soundVolume?: number;
  };
  formattedDays: string;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

// Update the getNextClosestAlarm function to handle all edge cases
const getNextClosestAlarm = (alarms: Alarm[]): Alarm | null => {
  if (!alarms || alarms.length === 0) return null;
  
  // Only consider enabled alarms
  const enabledAlarms = alarms.filter(alarm => alarm.enabled);
  if (enabledAlarms.length === 0) return null;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Convert JavaScript day to our format (1-7 where 1=Monday, 7=Sunday)
  const currentAppDay = currentDay === 0 ? '7' : currentDay.toString();
  
  // Calculate time until each alarm
  const alarmsWithTimeUntil = enabledAlarms.map(alarm => {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    let alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);
    
    // If alarm time has already passed today
    if (alarmDate <= now) {
      // Check if this alarm repeats on any day
      if (alarm.days && alarm.days.length > 0) {
        // Find the next day this alarm will ring
        const alarmDays = alarm.days.map(day => parseInt(day));
        const currentDayNum = parseInt(currentAppDay);
        
        // Sort days to find the next one after current day
        const sortedDays = [...alarmDays].sort((a, b) => a - b);
        
        // Find the next day after current day
        const nextDay = sortedDays.find(day => day > currentDayNum);
        
        if (nextDay) {
          // Next day is this week
          const daysUntilNextAlarm = nextDay - currentDayNum;
          alarmDate.setDate(alarmDate.getDate() + daysUntilNextAlarm);
        } else {
          // Next day is next week (wrap around)
          const nextDayNextWeek = sortedDays[0];
          const daysUntilNextAlarm = 7 - currentDayNum + nextDayNextWeek;
          alarmDate.setDate(alarmDate.getDate() + daysUntilNextAlarm);
        }
      } else {
        // One-time alarm for tomorrow
        alarmDate.setDate(alarmDate.getDate() + 1);
      }
    } else {
      // Alarm is later today - check if it should ring today
      if (alarm.days && alarm.days.length > 0) {
        // Only count if alarm is set for current day
        if (!alarm.days.includes(currentAppDay)) {
          // Find the next day this alarm will ring
          const alarmDays = alarm.days.map(day => parseInt(day));
          const currentDayNum = parseInt(currentAppDay);
          
          // Sort days to find the next one after current day
          const sortedDays = [...alarmDays].sort((a, b) => a - b);
          
          // Find the next day after current day
          const nextDay = sortedDays.find(day => day > currentDayNum);
          
          if (nextDay) {
            // Next day is this week
            const daysUntilNextAlarm = nextDay - currentDayNum;
            alarmDate.setDate(alarmDate.getDate() + daysUntilNextAlarm);
          } else {
            // Next day is next week (wrap around)
            const nextDayNextWeek = sortedDays[0];
            const daysUntilNextAlarm = 7 - currentDayNum + nextDayNextWeek;
            alarmDate.setDate(alarmDate.getDate() + daysUntilNextAlarm);
          }
        }
      }
    }
    
    const timeUntil = alarmDate.getTime() - now.getTime();
    return { alarm, timeUntil, nextRingDate: alarmDate };
  });
  
  // Sort by time until alarm and get the closest one
  alarmsWithTimeUntil.sort((a, b) => a.timeUntil - b.timeUntil);
  
  // Return the alarm with the smallest time until (the next one to ring)
  return alarmsWithTimeUntil[0]?.timeUntil < Infinity ? alarmsWithTimeUntil[0].alarm : null;
};

// Update the getMissionEmoji function to match the new emojis
const getMissionEmoji = (missionType: string): string => {
  // Handle null or undefined mission type
  if (!missionType) return '🔔';
  
  // Normalize the mission type for comparison
  const normalizedType = typeof missionType === 'string' 
    ? missionType.toLowerCase() 
    : '';
  
  // Direct mapping for exact matches
  if (normalizedType === 'math') return '🔢';
  if (normalizedType === 'typing') return '⌨️';
  if (normalizedType === 'wordle') return '🎲';
  if (normalizedType === 'qr' || normalizedType === 'qr/barcode') return '📱';
  
  // Special case for Tetris - use puzzle emoji
  if (normalizedType.includes('tetris')) return '🧩';
  
  // Special case for Cookie Jam - use bell emoji
  if (normalizedType.includes('cookie') || normalizedType.includes('jam')) return '🔔';
  
  // Default fallback
  return '🔔';
};

// Update the createTestAlarm function with complete settings
const createTestAlarm = async () => {
  try {
    console.log('Creating test alarm for 10 seconds from now');
    
    // Create a date 10 seconds from now
    const alarmTime = new Date();
    alarmTime.setSeconds(alarmTime.getSeconds() + 10);
    
    // Format the time as HH:MM
    const hours = alarmTime.getHours().toString().padStart(2, '0');
    const minutes = alarmTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // Create a test alarm object with complete settings
    const testAlarm = {
      id: `test_alarm_${Date.now()}`,
      time: timeString,
      days: [],
      label: 'Test Alarm',
      sound: 'Beacon',
      soundVolume: 1,
      vibration: true,
      enabled: true,
      snooze: {
        enabled: true,
        interval: 5,
        maxSnoozes: 3
      },
      mission: {
        id: `mission_${Date.now()}`,
        name: 'Tetris',
        icon: 'calculator',
        settings: null
      }
    };
    
    console.log('Test alarm details:', testAlarm);
    
    // Save the test alarm to storage so alarm-ring can find it
    const alarmsJson = await AsyncStorage.getItem('alarms');
    let alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
    alarms.push(testAlarm);
    await AsyncStorage.setItem('alarms', JSON.stringify(alarms));
    
    // Schedule the notification
    const notificationId = await scheduleAlarmNotification(testAlarm);
    
    // Show feedback to the user
    if (notificationId) {
      alert(`Test alarm scheduled for ${timeString} (in 10 seconds)`);
    } else {
      alert('Failed to schedule test alarm');
    }
  } catch (error: any) {
    console.error('Error creating test alarm:', error);
    alert(`Error: ${error.message}`);
  }
};

// Update the getNextAlarmText function to properly check upcoming alarms

const getNextAlarmText = (alarms: Alarm[]): string => {
  // Filter to only enabled alarms
  const enabledAlarms = alarms.filter(alarm => alarm.enabled);
  
  if (enabledAlarms.length === 0) {
    return 'No upcoming alarms';
  }
  
  // Get current date and time
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Map day strings to numbers
  const dayMap: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  
  // Calculate the next occurrence for each alarm
  const nextOccurrences = enabledAlarms.map(alarm => {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    
    // If the alarm has no days set, it's a one-time alarm
    if (!alarm.days || alarm.days.length === 0) {
      // Check if the alarm is for today but later
      if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
        // Alarm is later today
        return {
          alarm,
          days: 0,
          hours: hours - currentHour,
          minutes: minutes - currentMinute
        };
      } else {
        // Alarm is for tomorrow
        return {
          alarm,
          days: 1,
          hours: (24 + hours) - currentHour,
          minutes: minutes - currentMinute
        };
      }
    }
    
    // For repeating alarms, find the next occurrence
    let nextDay = 7; // Start with a value larger than any possible day
    let daysUntilNext = 7; // Maximum days until next alarm
    
    // Check each day the alarm is set for
    alarm.days.forEach(day => {
      const alarmDay = typeof day === 'string' ? dayMap[day.toLowerCase()] : day;
      
      if (alarmDay === undefined) return; // Skip invalid days
      
      // Calculate days until this occurrence
      let daysUntil = alarmDay - currentDay;
      if (daysUntil < 0) daysUntil += 7; // Wrap around to next week
      
      // If it's today, check the time
      if (daysUntil === 0) {
        // If the alarm time has already passed today, it will occur next week
        if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
          daysUntil = 7;
        }
      }
      
      // Update if this is sooner than our current soonest
      if (daysUntil < daysUntilNext) {
        daysUntilNext = daysUntil;
        nextDay = alarmDay;
      }
    });
    
    // Calculate total hours and minutes until the alarm
    let totalHours = (daysUntilNext * 24) + hours - currentHour;
    let totalMinutes = minutes - currentMinute;
    
    // Adjust for negative minutes
    if (totalMinutes < 0) {
      totalHours -= 1;
      totalMinutes += 60;
    }
    
    return {
      alarm,
      days: Math.floor(totalHours / 24),
      hours: totalHours % 24,
      minutes: totalMinutes
    };
  });
  
  // Sort by soonest
  nextOccurrences.sort((a, b) => {
    const aTime = a.days * 24 * 60 + a.hours * 60 + a.minutes;
    const bTime = b.days * 24 * 60 + b.hours * 60 + b.minutes;
    return aTime - bTime;
  });
  
  const next = nextOccurrences[0];
  
  // Format the time until next alarm
  if (next.days > 0) {
    return `Next alarm in ${next.days} day${next.days > 1 ? 's' : ''}, ${next.hours} hr${next.hours !== 1 ? 's' : ''}, ${next.minutes} min${next.minutes !== 1 ? 's' : ''}`;
  } else if (next.hours > 0) {
    return `Next alarm in ${next.hours} hr${next.hours !== 1 ? 's' : ''}, ${next.minutes} min${next.minutes !== 1 ? 's' : ''}`;
  } else {
    return `Next alarm in ${next.minutes} minute${next.minutes !== 1 ? 's' : ''}`;
  }
};

export default function TabOneScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isCreatingAlarm, setIsCreatingAlarm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Keep the loadAlarms effect
  useEffect(() => {
    loadAlarms();
  }, []);

  const loadAlarms = async () => {
    try {
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        let parsedAlarms = JSON.parse(alarmsJson);
        
        // Ensure every alarm has required properties
        parsedAlarms = parsedAlarms.map((alarm: any) => ({
          ...alarm,
          days: alarm.days || [],
          time: alarm.time || '00:00', // Ensure time always exists
          enabled: alarm.enabled !== undefined ? alarm.enabled : true
        }));
        
        // Save the fixed alarms back to storage
        await AsyncStorage.setItem('alarms', JSON.stringify(parsedAlarms));
        
        setAlarms(parsedAlarms);
      }
    } catch (error) {
      console.error('Home: Error loading alarms:', error);
    }
  };
  
  // Define fixAlarmEmojis inside the component
  const fixAlarmEmojis = async () => {
    try {
      // Get all alarms
      const alarmsString = await AsyncStorage.getItem('alarms');
      if (!alarmsString) return;
      
      const alarmIds = JSON.parse(alarmsString);
      let anyUpdated = false;
      
      // Process each alarm
      for (const alarmId of alarmIds) {
        const alarmString = await AsyncStorage.getItem(`alarm_${alarmId}`);
        if (!alarmString) continue;
        
        const alarm = JSON.parse(alarmString);
        
        // Check if the alarm has a mission
        if (alarm.mission) {
          const missionName = typeof alarm.mission === 'object' ? alarm.mission.name : alarm.mission;
          const correctEmoji = getMissionEmoji(missionName);
          
          // If the mission is an object with an icon property
          if (typeof alarm.mission === 'object' && alarm.mission.icon) {
            // Check if the emoji is incorrect
            if (alarm.mission.icon !== correctEmoji) {
              // Update the emoji
              alarm.mission.icon = correctEmoji;
              anyUpdated = true;
              
              // Save the updated alarm
              await AsyncStorage.setItem(`alarm_${alarmId}`, JSON.stringify(alarm));
            }
          }
        }
      }
      
      // If any alarms were updated, refresh the list
      if (anyUpdated) {
        loadAlarms();
      }
    } catch (error) {
      console.error('Error fixing alarm emojis:', error);
    }
  };
  
  // Call both functions in useEffect
  useEffect(() => {
    loadAlarms();
    fixAlarmEmojis();
  }, []);

  const toggleAlarm = async (id: string) => {
    try {
      const updatedAlarms = alarms.map(alarm => {
        if (alarm.id === id) {
          // Make sure time is defined
          if (!alarm.time) {
            console.warn(`Alarm ${id} has undefined time, setting default`);
            alarm.time = '08:00'; // Default time
          }
          
          const updatedAlarm = { 
            ...alarm, 
            enabled: !alarm.enabled 
          };
          
          if (updatedAlarm.enabled) {
            scheduleAlarmNotification(updatedAlarm);
          } else {
            cancelAlarmNotification(id);
          }
          return updatedAlarm;
        }
        return alarm;
      });
      
      setAlarms(updatedAlarms);
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
    } catch (error) {
      console.error('Error toggling alarm:', error);
    }
  };

  const deleteAlarm = async (id: string) => {
    await cancelAlarmNotification(id);
    const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
  };

  const duplicateAlarm = async (alarm: Alarm) => {
    const newAlarm = {
      ...alarm,
      id: `alarm_${Date.now()}`,
      enabled: true
    };
    const updatedAlarms = [...alarms, newAlarm];
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
    if (newAlarm.enabled) {
      await scheduleAlarmNotification(newAlarm);
    }
  };

  // Update the formatDays function to ensure proper sorting
  const formatDays = (days: string[]): string => {
    // Return empty string to hide days in UI
    return '';
  };

  // Add this effect to check notification permissions
  useEffect(() => {
    checkNotificationPermissions();
  }, []);
  
  // Add this function to check permissions
  const checkNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };
  
  // Add this function to open settings
  const openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Only request permissions when this tab is active
  useEffect(() => {
    // This won't show a prompt if permissions are already granted
    const checkPermissionsForAlarms = async () => {
      // We only check permissions when the user navigates to the Alarms tab
      // This will not show a prompt unless the user tries to create an alarm
    };
    
    checkPermissionsForAlarms();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Notification Permission Banner */}
      {!notificationsEnabled && (
        <TouchableOpacity 
          style={styles.permissionBanner}
          onPress={openNotificationSettings}
        >
          <Ionicons name="notifications-off" size={24} color="#FF3B30" />
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Notifications Disabled</Text>
            <Text style={styles.permissionText}>
              Alarms require notifications to function properly. Tap here to enable in Settings.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      {alarms && alarms.length > 0 ? (
        <FlatList
          data={alarms}
          renderItem={({ item }) => {
            console.log('Rendering alarm:', item); // Debug log
            console.log('Mission in render:', item.mission);
            return (
              <AlarmItem
                key={`alarm-${item.id}`}
                alarm={{
                  id: item.id,
                  time: item.time,
                  enabled: item.enabled,
                  days: item.days,
                  label: item.label || '',
                  mission: item.mission ? (typeof item.mission === 'string' ? item.mission : item.mission.name) : null,
                  sound: item.sound,
                  volume: item.soundVolume,
                  vibration: item.vibration
                }}
                formattedDays={formatDays(item.days)}
                onToggle={() => toggleAlarm(item.id)}
                onDelete={() => deleteAlarm(item.id)}
                onDuplicate={() => duplicateAlarm(item)}
                onEdit={() => {
                  console.log('Editing alarm with mission:', item.mission); // Debug log
                  router.push({
                    pathname: '/new-alarm',
                    params: {
                      alarmId: item.id,
                      editMode: 'true',
                      time: item.time,
                      days: JSON.stringify(item.days),
                      label: item.label,
                      mission: item.mission ? JSON.stringify(item.mission) : null,
                      sound: item.sound,
                      volume: item.soundVolume.toString(),
                      vibration: item.vibration.toString()
                    }
                  });
                }}
              >
                {item.mission && (
                  <View style={styles.missionContainer}>
                    <Text style={styles.missionIcon}>
                      {getMissionEmoji(item.mission.name)}
                    </Text>
                    <Text style={styles.missionName}>
                      {typeof item.mission === 'object' ? item.mission.name : item.mission}
                    </Text>
                  </View>
                )}
              </AlarmItem>
            );
          }}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.alarmList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No alarms yet</Text>
          <Text style={styles.emptyStateSubtext}>Tap + to add an alarm</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/new-alarm')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  nextAlarmContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  nextAlarmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  alarmList: {
    flex: 1,
  },
  alarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  alarmInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  labelText: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
  },
  daysText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -40, // Adjust based on your header size
  },
  emptyStateText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  missionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionIcon: {
    fontSize: 20,
    color: '#fff',
  },
  missionName: {
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  permissionTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  permissionText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});