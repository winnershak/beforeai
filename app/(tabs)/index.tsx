import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Linking, Platform, Switch, Image, ScrollView } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { AlarmItem } from '@/components/AlarmItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { scheduleAlarmNotification, cancelAlarmNotification } from '../notifications';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import RevenueCatService from '../services/RevenueCatService';
import * as ImagePicker from 'expo-image-picker';
// import firestore from '@react-native-firebase/firestore';
// import { getCurrentUser, getUserProfile } from '../config/firebase';
// Add these new imports for Instagram sharing
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';

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

// Add this interface near the top with other interfaces
interface WakeUpItem {
  id: string;
  actualTime?: string;
  wakeUpTime?: string;
  targetTime?: string;
  message?: string;
  soundUsed?: string;
  date?: string;
  createdAt?: Date;
  consistency?: {
    wakeUpsThisWeek: number;
  };
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

// Add this helper function to format time in 24-hour format
const formatTime24Hour = (time: string): string => {
  // The time is already in HH:MM format, so we just need to ensure proper padding
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
  if (normalizedType.includes('cookie') || normalizedType === 'jam') return '🔔';
  
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

// Update your clearScheduledAlarmRing function
const clearScheduledAlarmRing = (alarmId: string) => {
  try {
    console.log(`Attempting to clear scheduled alarm ring for: ${alarmId}`);
    
    // Check if global.alarmTimers exists and has this alarm
    if (typeof global.alarmTimers !== 'undefined' && global.alarmTimers[alarmId]) {
      console.log(`Found timer for alarm ${alarmId}, clearing it now`);
      clearTimeout(global.alarmTimers[alarmId]);
      delete global.alarmTimers[alarmId];
      console.log(`Successfully cleared timer for alarm: ${alarmId}`);
    } else {
      console.log(`No timer found for alarm: ${alarmId}`);
    }
  } catch (error) {
    console.error('Error clearing scheduled alarm ring:', error);
  }
};

// Add interface for wake-up history
interface WakeupRecord {
  date: string;
  time: string;
  alarmId: string;
}

// Update generateCalendarDays to accept month offset
const generateCalendarDays = (wakeupHistory: WakeupRecord[], monthOffset: number = 0) => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const currentMonth = targetDate.getMonth();
  const currentYear = targetDate.getFullYear();
  
  // Create a date for the first day of the target month
  const firstDay = new Date(currentYear, currentMonth, 1);
  // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDay.getDay();
  
  // Get the last day of the target month
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Create an array to hold all calendar cells
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, record: null, isToday: false });
  }
  
  // Add cells for each day of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    // Fix the date string to use local date instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const record = wakeupHistory.find((r: WakeupRecord) => r.date === dateString);
    // Check if it's today (only if we're viewing current month)
    const isToday = monthOffset === 0 && i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    
    days.push({ date, record, isToday });
  }
  
  // Only add empty cells to complete the CURRENT week, not to fill a full 6x7 grid
  const totalCells = days.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const cellsToAdd = 7 - remainder;
    for (let i = 0; i < cellsToAdd; i++) {
      days.push({ date: null, record: null, isToday: false });
    }
  }
  
  return days;
};

// Add this function near your other helper functions (around line 1120):
const formatTweetDateTime = (date: Date | string | undefined | null) => {
  if (!date) return 'Unknown date';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid date';
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Add this component before export default function TabOneScreen()
function JournalEntries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const savedEntries = await AsyncStorage.getItem('journalEntries');
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        setEntries(parsedEntries);
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadEntries();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading journal...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyJournal}>
        <Text style={styles.emptyJournalTitle}>No journal entries yet 📔</Text>
        <Text style={styles.emptyJournalText}>
          Your morning reflections will appear here automatically after you wake up
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.journalFeed}>
      {entries.map((entry, index) => (
        <View key={entry.id || index} style={styles.premiumJournalEntry}>
          {/* Date */}
          <Text style={styles.premiumDate}>
            {new Date(entry.date).toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          
          {/* Time */}
          <Text style={styles.premiumTime}>{entry.wakeUpTime}</Text>
          
          {/* Message */}
          {entry.message && entry.message.trim() && (
            <Text style={styles.premiumMessage}>{entry.message}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export default function TabOneScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isCreatingAlarm, setIsCreatingAlarm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Add state for view mode
  const [viewMode, setViewMode] = useState<'alarms' | 'week' | 'month' | 'journal' | 'feed'>('alarms');
  // Add state for wake-up history
  const [wakeupHistory, setWakeupHistory] = useState<WakeupRecord[]>([]);
  // Add isPremium state
  const [isPremium, setIsPremium] = useState(false);
  // Add navigation state for week and month
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, 1 = next week
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // 0 = current month, -1 = last month, 1 = next month
  // Add these state variables for swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // Add state for profile photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [myWakeUps, setMyWakeUps] = useState<WakeUpItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  // const [firebaseUser, setFirebaseUser] = useState(getCurrentUser());
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Add refs for capturing the views
  const weekViewRef = useRef<View>(null);
  const monthViewRef = useRef<View>(null);

  // Load alarms from storage
  useEffect(() => {
    loadAlarms();
    loadWakeupHistory(); // Add this to load wake-up history
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

  // The toggleAlarm function already has the right logic:
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
            cancelAlarmNotification(id); // This line needs the import to work
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
    try {
      console.log(`Deleting alarm: ${id}`);
      
      // 1. Cancel all notifications for this alarm
      // This function already handles finding notifications by alarmId
      await cancelAlarmNotification(id);
      
      // 2. Clear any scheduled alarm ring screens
      clearScheduledAlarmRing(id);
      
      // 3. Clear any active alarm state in AsyncStorage
      const activeAlarmJson = await AsyncStorage.getItem('activeAlarm');
      if (activeAlarmJson) {
        const activeAlarm = JSON.parse(activeAlarmJson);
        if (activeAlarm && activeAlarm.alarmId === id) {
          await AsyncStorage.removeItem('activeAlarm');
          console.log(`Cleared active alarm state for: ${id}`);
        }
      }
      
      // 4. Update the alarms list and storage
      const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
      setAlarms(updatedAlarms);
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      
      console.log(`Alarm ${id} completely deleted with all resources`);
    } catch (error) {
      console.error('Error deleting alarm:', error);
    }
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
  
  // Function to open notification settings specifically
  const openNotificationSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, try to open notification settings directly
        await Linking.openURL('App-prefs:root=NOTIFICATIONS_ID');
      } else {
        // On Android, open notification settings
        await Linking.openSettings();
        // For newer Android versions, you could try this more specific intent:
        // await Linking.openURL('android.settings.APP_NOTIFICATION_SETTINGS');
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      // Fallback to general settings if specific notification settings fail
      try {
        if (Platform.OS === 'ios') {
          await Linking.openURL('app-settings:');
        } else {
          await Linking.openSettings();
        }
      } catch (secondError) {
        console.error('Error opening general settings:', secondError);
      }
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

  // Function to request notification permissions directly
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setNotificationsEnabled(true);
          return; // Successfully enabled - don't continue to settings
        }
      }
      
      // If we get here, permission wasn't granted through the direct request
      // This means user previously denied or we need to go to settings
      Alert.alert(
        "Additional Permissions Needed",
        "Please enable notifications for this app in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openNotificationSettings }
        ]
      );
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      // Only open settings as a last resort if the request failed entirely
      openNotificationSettings();
    }
  };

  // Show custom permission request dialog
  const showNotificationPermissionDialog = () => {
    Alert.alert(
      "Enable Notifications",
      "Alarms require notifications to function properly. Would you like to enable notifications now?",
      [
        {
          text: "Not Now",
          style: "cancel"
        },
        { 
          text: "Allow", 
          onPress: requestNotificationPermission,
          style: "default"
        }
      ],
      { cancelable: false }
    );
  };

  // Add function to load wake-up history
  const loadWakeupHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('wakeupHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        // Convert object to array and sort by date
        const historyArray = Object.keys(history).map(date => ({
          date,
          ...history[date]
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setWakeupHistory(historyArray);
      }
    } catch (error) {
      console.error('Error loading wake-up history:', error);
    }
  };

  // Add function to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Update calculate average time to calculate the actual average
  const calculateAverageTime = (records: WakeupRecord[]) => {
    if (records.length === 0) return 'No data';
    
    let totalMinutes = 0; 
    
    records.forEach(record => {
      const [hours, minutes] = record.time.split(':').map(Number);
      totalMinutes += hours * 60 + minutes;
    });
    
    const avgMinutes = Math.round(totalMinutes / records.length);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    
    return `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`;
  };

  // Add these functions inside the component, after loadWakeupHistory
  const getWeekDataWithOffset = (weekOffset: number = 0) => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (weekOffset * 7));
    
    const oneWeekBefore = new Date(targetDate);
    oneWeekBefore.setDate(targetDate.getDate() - 6);
    
    const oneWeekAfter = new Date(targetDate);
    oneWeekAfter.setDate(targetDate.getDate() + 1);
    
    return wakeupHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= oneWeekBefore && recordDate < oneWeekAfter;
    });
  };

  const getMonthDataWithOffset = (monthOffset: number = 0) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    return wakeupHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startOfMonth && recordDate <= endOfMonth;
    });
  };

  const getMonthName = (monthOffset: number = 0) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset);
    
    // Check if it's June 2025
    if (targetDate.getFullYear() === 2025 && targetDate.getMonth() === 5) { // June is month 5 (0-indexed)
      return 'This Month';
    }
    
    return targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Add this inside your component, after the other useEffect hooks
  useFocusEffect(
    React.useCallback(() => {
      console.log('Alarms tab focused, reloading wake-up history');
      loadWakeupHistory();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Add useEffect to check premium status
  useEffect(() => {
    const checkPremium = async () => {
      const isPremium = await RevenueCatService.checkLocalSubscriptionStatus();
      setIsPremium(isPremium);
    };
    checkPremium();
  }, []);

  // Add these swipe handler functions
  const handleTouchStart = (e: any) => {
    setTouchEnd(null);
    setTouchStart(e.nativeEvent.pageX);
  };

  const handleTouchMove = (e: any) => {
    setTouchEnd(e.nativeEvent.pageX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 30; // Reduced from 50 for better sensitivity
    const isRightSwipe = distance < -30; // Reduced from 50 for better sensitivity
    
    if (viewMode === 'week') {
      if (isLeftSwipe) {
        setCurrentWeekOffset(currentWeekOffset + 1); // Next week
      } else if (isRightSwipe) {
        setCurrentWeekOffset(currentWeekOffset - 1); // Previous week
      }
    } else if (viewMode === 'month') {
      if (isLeftSwipe) {
        setCurrentMonthOffset(currentMonthOffset + 1); // Next month
      } else if (isRightSwipe) {
        setCurrentMonthOffset(currentMonthOffset - 1); // Previous month
      }
    }
  };

  const getWeekPeriodText = (weekOffset: number = 0) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7)); // Start on Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
    
    if (weekOffset === 0) {
      return 'This Week';
    } else if (weekOffset === -1) {
      return 'Last Week';
    } else if (weekOffset === 1) {
      return 'Next Week';
    } else {
      // Show date range for other weeks
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const startDay = startOfWeek.getDate();
      const endDay = endOfWeek.getDate();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
      }
    }
  };

  // Load profile photo from storage
  const loadProfilePhoto = async () => {
    try {
      const photo = await AsyncStorage.getItem('profilePhoto');
      if (photo) {
        setProfilePhoto(photo);
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  // Function to pick and save profile photo
  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setProfilePhoto(photoUri);
        await AsyncStorage.setItem('profilePhoto', photoUri);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
    }
  };

  // Replace the shareCurrentView function with this new Instagram share function
  const shareToInstagramStory = async () => {
    try {
      console.log('📸 Starting Instagram story share...');
      
      // Determine which view to capture
      const viewRef = viewMode === 'week' ? weekViewRef : monthViewRef;
      const viewType = viewMode === 'week' ? 'Weekly' : 'Monthly';
      
      if (!viewRef.current) {
        Alert.alert('Error', 'Unable to capture view. Please try again.');
        return;
      }

      // Capture the current view
      console.log(`📱 Capturing ${viewType} view...`);
      const uri = await captureRef(viewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('✅ View captured successfully:', uri);

      // Check if Instagram is installed
      const canOpenInstagram = await Linking.canOpenURL('instagram-stories://share');
      if (!canOpenInstagram) {
        Alert.alert('Instagram Required', 'Please install Instagram to share to stories');
        return;
      }

      // Share to Instagram Stories using the same method as alarm-success
      const shareOptions = {
        stickerImage: uri,
        social: Share.Social.INSTAGRAM_STORIES as any,
        appId: '1104244401532187',
        backgroundBottomColor: '#1a1a2e',
        backgroundTopColor: '#1a1a2e',
      };
      
      await Share.shareSingle(shareOptions);
      console.log('✅ Successfully shared to Instagram Stories!');
      
    } catch (error: any) {
      console.error('💥 Error sharing to Instagram:', error);
      Alert.alert('Sharing Error', 'Unable to share to Instagram. Please try again.');
    }
  };

  // Add this with your other useEffect hooks
  useEffect(() => {
    loadProfilePhoto();
  }, []);

  // Load ONLY current user's wake-ups
  const loadMyWakeUps = async () => {
    setLoadingFeed(true);
    try {
      // const user = getCurrentUser();
      // if (!user) {
      //   console.log('User not signed in');
      //   setMyWakeUps([]);
      //   return;
      // }

      // Try to refresh user profile data, but don't let it block wake-ups loading
      try {
        // const profile = await getUserProfile(user.uid);
        // setUserProfile(profile);
      } catch (profileError) {
        console.log('Error loading profile (continuing anyway):', profileError);
        // Continue loading wake-ups even if profile fails
      }

      // Load wake-ups from Firebase
      // const snapshot = await firestore()
      //   .collection('wakeups')
      //   .where('userId', '==', user.uid)
      //   .limit(30)
      //   .get();
      
      // const wakeUps = snapshot.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data(),
      //   createdAt: doc.data().createdAt?.toDate(),
      // }));
      
      // wakeUps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      // setMyWakeUps(wakeUps);
      console.log(`📱 Loaded ${myWakeUps.length} wake-ups from Firebase`);
    } catch (error) {
      console.log('Error loading Firebase wake-ups:', error);
      setMyWakeUps([]);
    } finally {
      setLoadingFeed(false);
    }
  };

  // Load feed when user switches to feed view
  useEffect(() => {
    if (viewMode === 'feed') {
      loadMyWakeUps();
    }
  }, [viewMode]);

  // Refresh feed when returning to tab (same as calendar):
  useFocusEffect(
    React.useCallback(() => {
      if (viewMode === 'feed') {
        loadMyWakeUps();
      }
    }, [viewMode])
  );

  // Helper function to format exact time
  const formatExactTime = (timeString: string | undefined) => {
    if (!timeString) return 'No time recorded';
    
    // If it's a full ISO date string
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // If it's already in HH:MM format
    return timeString;
  };

  // Helper function to format date nicely
  const formatFeedDate = (date: Date | string | undefined | null) => {
    if (!date) return 'Unknown date';
    
    const today = new Date();
    const targetDate = new Date(date);
    
    if (targetDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (targetDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return targetDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Add delete function:
  const deleteWakeUp = async (wakeUpId: string) => {
    try {
      // const user = getCurrentUser();
      // if (!user) return;

      // await firestore()
      //   .collection('wakeups')
      //   .doc(wakeUpId)
      //   .delete();

      // // Refresh feed
      // loadMyWakeUps();
    } catch (error) {
      console.error('Failed to delete wake-up:', error);
    }
  };

  // Load profile when user changes:
  useEffect(() => {
    // Firebase disabled
    // if (firebaseUser) {
    //   loadUserProfile();
    // }
  }, [firebaseUser]);

  const loadUserProfile = async () => {
    try {
      // Firebase disabled
      // if (!firebaseUser) return;
      // const profile = await getUserProfile(firebaseUser.uid);
      // setUserProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Notification Permission Banner */}
      {!notificationsEnabled && (
        <TouchableOpacity 
          style={styles.permissionBanner}
          onPress={showNotificationPermissionDialog}
        >
          <Ionicons name="notifications-off" size={24} color="#FF3B30" />
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Notifications Disabled</Text>
            <Text style={styles.permissionText}>
              Alarms require notifications to function properly. Tap here to enable.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'alarms' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('alarms')}
        >
          <Text style={[styles.viewModeText, viewMode === 'alarms' && styles.viewModeTextActive]}>Alarms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>Month</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'journal' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('journal')}
        >
          <Text style={[styles.viewModeText, viewMode === 'journal' && styles.viewModeTextActive]}>Journal</Text>
        </TouchableOpacity>
      </View>

      {/* Alarms View */}
      {viewMode === 'alarms' && (
        <>
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
        </>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <ScrollView style={styles.historyContainer}>
          <View ref={weekViewRef} style={styles.captureContainer}>
            {/* Centered Profile Photo - moved to top */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickProfilePhoto} style={styles.profilePhotoContainerLarge}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profilePhotoLarge} />
                ) : (
                  <Text style={styles.defaultProfileEmojiLarge}>😊</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.historyHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.blissAlarmBranding}>Bliss Alarm App</Text>
                <Text style={styles.periodText}>{getWeekPeriodText(currentWeekOffset)} Wake-Ups</Text>
                <Text style={styles.historyAverage}>
                  Average: {calculateAverageTime(getWeekDataWithOffset(currentWeekOffset))}
                </Text>
              </View>
            </View>
            
            <View 
              style={styles.weekContainer}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {Array.from({ length: 7 }).map((_, index) => {
                const today = new Date();
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + (currentWeekOffset * 7) - (6 - index));
                
                // Fix the date string to use local date
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                
                // Find if we have a record for this date
                const record = wakeupHistory.find((r: WakeupRecord) => r.date === dateString);
                const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
                
                // Check if this is today (only if viewing current week)
                const isToday = currentWeekOffset === 0 && targetDate.toDateString() === today.toDateString();
                
                return (
                  <View key={index} style={styles.weekDay}>
                    <Text style={styles.weekDayName}>{dayName}</Text>
                    <Text style={styles.weekDayDate}>
                      {targetDate.getDate()}
                    </Text>
                    {record ? (
                      <Text style={[
                        styles.weekDayTime,
                        isToday ? styles.weekDayTimeToday : null
                      ]}>
                        {formatTime24Hour(record.time)}
                      </Text>
                    ) : (
                      <Text style={styles.weekDayNoTime}>-</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          
          <TouchableOpacity onPress={shareToInstagramStory} style={styles.shareButtonBottom}>
            <Ionicons name="logo-instagram" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share to Instagram Story</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <ScrollView style={styles.historyContainer}>
          <View ref={monthViewRef} style={styles.captureContainer}>
            {/* Centered Profile Photo - moved to top */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickProfilePhoto} style={styles.profilePhotoContainerLarge}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profilePhotoLarge} />
                ) : (
                  <Text style={styles.defaultProfileEmojiLarge}>😊</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.historyHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.blissAlarmBranding}>Bliss Alarm App</Text>
                <Text style={styles.periodText}>{getMonthName(currentMonthOffset)} Wake-Ups</Text>
                <Text style={styles.historyAverage}>
                  Average: {calculateAverageTime(getMonthDataWithOffset(currentMonthOffset))}
                </Text>
              </View>
            </View>
            
            <View style={styles.calendarHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Text key={index} style={styles.calendarHeaderDay}>{day}</Text>
              ))}
            </View>
            
            <View 
              style={styles.calendarGrid}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {generateCalendarDays(wakeupHistory, currentMonthOffset).map((day, index) => (
                <View key={index} style={styles.calendarDay}>
                  {day.date ? (
                    <>
                      <Text style={styles.calendarDayNumber}>
                        {day.date.getDate()}
                      </Text>
                      {day.record ? (
                        <Text style={[
                          styles.calendarDayTime,
                          day.isToday ? styles.calendarDayTimeToday : null
                        ]}>
                          {formatTime24Hour(day.record.time)}
                        </Text>
                      ) : (
                        <Text style={styles.calendarDayEmpty}>-</Text>
                      )}
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
          
          <TouchableOpacity onPress={shareToInstagramStory} style={styles.shareButtonBottom}>
            <Ionicons name="logo-instagram" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share to Instagram Story</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Journal View */}
      {viewMode === 'journal' && (
        <ScrollView style={styles.historyContainer}>
          <View style={styles.journalHeaderSection}>
            <Text style={styles.journalTitle}>Wake-up Journal</Text>
          </View>
          
          <JournalEntries />
        </ScrollView>
      )}

      {/* Feed View - Personal wake-up history */}
      {viewMode === 'feed' && (
        <View style={styles.feedContainer}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>My Wake-Up Journey 🌅</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadMyWakeUps}
              disabled={loadingFeed}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={loadingFeed ? "#666" : "#007AFF"} 
              />
            </TouchableOpacity>
          </View>

          {loadingFeed ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading your wake-ups...</Text>
            </View>
          ) : myWakeUps.length > 0 ? (
            <FlatList
              data={myWakeUps}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.tweetContainer}>
                  {/* User Info Header */}
                  <View style={styles.tweetHeader}>
                    <Image 
                      style={styles.profilePic}
                      // source={{ uri: firebaseUser?.photoURL || 'https://via.placeholder.com/40' }}
                      source={{ uri: 'https://via.placeholder.com/40' }}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.displayName}>
                        {/* {userProfile?.displayName || firebaseUser?.displayName || firebaseUser?.email || 'Bliss User'} */}
                        Bliss User
                      </Text>
                      <Text style={styles.username}>
                        {/* @{userProfile?.username || firebaseUser?.email?.split('@')[0] || 'blissuser'} */}
                        @blissuser
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteWakeUp(item.id)}
                    >
                      <Text style={styles.deleteText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tweet Content - ONLY if there's a real custom message */}
                  {item.message && item.message.trim() !== '' && (
                    <View style={styles.tweetContent}>
                      <Text style={styles.tweetText}>{item.message}</Text>
                    </View>
                  )}

                  {/* Date and Time Footer - Always show */}
                  <View style={styles.tweetFooter}>
                    <Text style={styles.tweetDateTime}>
                      {formatTweetDateTime(item.date || item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.feedContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyFeedTitle}>No wake-ups recorded yet! 🌅</Text>
              <Text style={styles.emptyFeedText}>
                Start using your alarms and your wake-up times will appear here
              </Text>
              <Text style={styles.emptyFeedSubtext}>
                {/* Sign in to Firebase to save your wake-up journey */}
                Start your wake-up journey
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Only show add button in alarms view */}
      {viewMode === 'alarms' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            router.push('/new-alarm');
          }}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addButtonText}>New Alarm</Text>
        </TouchableOpacity>
      )}
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    height: 44, // Make tabs taller for easier tapping
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12, // Increase padding for larger touch target
    alignItems: 'center',
    justifyContent: 'center', // Center text vertically
  },
  viewModeButtonActive: {
    backgroundColor: '#3A3A3C',
  },
  viewModeText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  viewModeTextActive: {
    color: '#fff',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  blissAlarmBranding: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  periodText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  historyAverage: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 15, // Add this to move it away from border
    textAlign: 'right', // Add this to align properly
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyDate: {
    color: '#fff',
    fontSize: 16,
  },
  historyTime: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyHistory: {
    padding: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: '#999',
    fontSize: 16,
  },
  debugButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '500',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  weekDay: {
    alignItems: 'center',
    width: 40,
  },
  weekDayName: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  weekDayDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  weekDayTime: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  weekDayTimeToday: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  weekDayNoTime: {
    color: '#666',
    fontSize: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarHeaderDay: {
    color: '#999',
    fontSize: 12,
    width: '14.28%',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  calendarDay: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
  },
  calendarDayNumber: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  calendarDayTime: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: '500',
  },
  calendarDayEmpty: {
    color: '#666',
    fontSize: 10,
  },
  calendarDayTimeToday: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  addButtonPremium: {
    opacity: 0.8,
  },
  premiumLock: {
    marginLeft: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    minWidth: 80,
  },
  navButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  currentPeriodText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 5,
    paddingVertical: 4,
  },
  profilePhotoContainerLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 10,
  },
  profilePhotoLarge: {
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  defaultProfileEmojiLarge: {
    fontSize: 60,
  },
  periodInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  shareButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    marginHorizontal: 20,
  },
  shareButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  feedTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
  feedList: {
    padding: 20,
  },
  tweetContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tweetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  displayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: '#999',
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    marginLeft: 8,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tweetContent: {
    marginLeft: 52, // Align with username
  },
  tweetText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  tweetFooter: {
    alignItems: 'flex-end',
  },
  tweetDateTime: {
    color: '#999',
    fontSize: 14,
  },
  emptyFeed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyFeedTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyFeedText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyFeedSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  // Add new styles for Instagram sharing
  captureContainer: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  instagramShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4405F', // Instagram brand color
    borderRadius: 16,
    padding: 18,
    marginVertical: 24,
    marginHorizontal: 20,
    shadowColor: '#E4405F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instagramShareText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  journalContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  journalTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  journalSubtitle: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  journalFeed: {
    paddingHorizontal: 0,
  },
  journalTweet: {
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tweetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tweetAvatarEmoji: {
    fontSize: 18,
  },
  tweetUserInfo: {
    flex: 1,
  },
  tweetUserName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tweetTime: {
    color: '#71767B',
    fontSize: 15,
    marginTop: 1,
  },
  emptyJournal: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyJournalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyJournalText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  journalList: {
    marginTop: 0,
  },
  journalEntryLeft: {
    // Remove this style
  },
  journalHeader: {
    marginBottom: 8,
  },
  journalDateTime: {
    color: '#71767B',
    fontSize: 15,
    fontWeight: '500',
  },
  journalMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  journalHeaderSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  premiumJournalEntry: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  premiumDate: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  premiumTime: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 16,
  },
  premiumMessage: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
});