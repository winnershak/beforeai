import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { AlarmItem } from '@/components/AlarmItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scheduleAlarmNotification, cancelAlarmNotification } from '../notifications';

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
  } | null;
  sound: string;
  volume: number;
  vibration: boolean;
  soundVolume: number;
}

// Add this function to calculate time difference
const calculateTimeUntilAlarm = (alarmTime: string) => {
  const [hours, minutes] = alarmTime.split(':').map(Number);
  const now = new Date();
  const alarm = new Date();
  alarm.setHours(hours, minutes, 0);

  // If alarm time is earlier than current time, set it for next day
  if (alarm < now) {
    alarm.setDate(alarm.getDate() + 1);
  }

  const diff = alarm.getTime() - now.getTime();
  const hrsUntil = Math.floor(diff / (1000 * 60 * 60));
  const minsUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hrsUntil}hrs ${minsUntil}min`;
};

// Update this helper function at the top of your file
const getDayName = (day: string): string => {
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
  return dayMap[day] || '';
};

interface AlarmItemProps {
  alarm: {
    id: string;
    time: string;
    enabled: boolean;
    days: string[];
    label: string;
    mission: {
      id: string;
      name: string;
      icon: string;
    } | null;
    sound: string;
    volume: number;
    vibration: boolean;
    soundVolume: number;
  };
  formattedDays: string;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

// Add this function to calculate the next closest alarm
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
    const alarmDate = new Date();
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
        // One-time alarm that already passed today - not relevant
        return { alarm, timeUntil: Infinity };
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
    return { alarm, timeUntil };
  });
  
  // Sort by time until alarm and get the closest one
  alarmsWithTimeUntil.sort((a, b) => a.timeUntil - b.timeUntil);
  
  // Return the alarm with the smallest time until (the next one to ring)
  return alarmsWithTimeUntil[0]?.timeUntil < Infinity ? alarmsWithTimeUntil[0].alarm : null;
};

export default function TabOneScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isCreatingAlarm, setIsCreatingAlarm] = useState(false);

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

  const toggleAlarm = async (id: string) => {
    const updatedAlarms = alarms.map(alarm => {
      if (alarm.id === id) {
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
    if (!days || days.length === 0) return 'Once';
    
    // Custom sort function to handle both formats (1-7 and 0-6)
    const sortedDays = [...days].sort((a, b) => {
      // Convert to numbers for comparison
      let numA = parseInt(a);
      let numB = parseInt(b);
      
      // If using JavaScript format (0=Sunday), convert to our format (7=Sunday)
      if (numA === 0) numA = 7;
      if (numB === 0) numB = 7;
      
      return numA - numB;
    });
    
    console.log('Sorted days:', sortedDays);
    return sortedDays.map(day => getDayName(day)).join(', ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alarm</Text>
      </View>

      {alarms.length > 0 && (
        <View style={styles.nextAlarmContainer}>
          <Text style={styles.nextAlarmText}>
            Ring in {calculateTimeUntilAlarm(getNextClosestAlarm(alarms)?.time || '')}
          </Text>
        </View>
      )}

      {alarms && alarms.length > 0 ? (
        <FlatList
          data={alarms}
          renderItem={({ item }) => {
            console.log('Rendering alarm:', item); // Debug log
            return (
              <AlarmItem
                key={`alarm-${item.id}`}
                alarm={{
                  id: item.id,
                  time: item.time,
                  enabled: item.enabled,
                  days: item.days,
                  label: item.label || '',
                  mission: item.mission?.name || null,  // Access name from mission object
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
                      mission: JSON.stringify(item.mission),
                      sound: item.sound,
                      volume: item.soundVolume.toString(),
                      vibration: item.vibration.toString()
                    }
                  });
                }}
              />
            );
          }}
          keyExtractor={item => item.id}
          style={styles.alarmList}
          contentContainerStyle={styles.alarmListContent}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="alarm-outline" size={80} color="#007AFF" />
          </View>
          <Text style={styles.emptyStateTitle}>Rise and Shine!</Text>
          <Text style={styles.emptyStateText}>
            You haven't set any alarms yet. Create your first alarm to start your day right.
          </Text>
        </View>
      )}

      <Link href="/new-alarm" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
  },
  nextAlarmContainer: {
    padding: 20,
  },
  nextAlarmText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  alarmList: {
    flex: 1,
  },
  alarmListContent: {
    paddingBottom: 140,
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
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1,
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
  },
  labelMissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionText: {
    color: '#666',
    fontSize: 15,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -40, // Adjust based on your header size
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyStateHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyStateHint: {
    fontSize: 15,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
});