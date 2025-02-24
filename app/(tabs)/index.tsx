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
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

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
      const savedAlarms = await AsyncStorage.getItem('alarms');
      if (savedAlarms) {
        setAlarms(JSON.parse(savedAlarms));
      }
    } catch (error) {
      console.error('Error loading alarms:', error);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alarm</Text>
      </View>

      {alarms.length > 0 && (
        <View style={styles.nextAlarmContainer}>
          <Text style={styles.nextAlarmText}>
            Ring in {calculateTimeUntilAlarm(
              alarms
                .filter(a => a.enabled)
                .sort((a, b) => a.time.localeCompare(b.time))[0]?.time || ''
            )}
          </Text>
        </View>
      )}

      <FlatList
        data={alarms}
        renderItem={({ item }) => (
          <AlarmItem
            key={item.id}
            alarm={{
              ...item,
              mission: item.mission ? (typeof item.mission === 'object' ? item.mission.name : item.mission) : null
            }}
            onToggle={() => toggleAlarm(item.id)}
            onDelete={() => deleteAlarm(item.id)}
            onDuplicate={() => duplicateAlarm(item)}
            onEdit={() => {
              router.push({
                pathname: '/new-alarm',
                params: {
                  alarmId: item.id,
                  time: item.time,
                  days: JSON.stringify(item.days),
                  label: item.label,
                  mission: item.mission ? JSON.stringify(item.mission) : null,
                  sound: item.sound,
                  volume: item.volume?.toString(),
                  vibration: item.vibration?.toString(),
                  isEditing: 'true'
                }
              });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.alarmList}
        contentContainerStyle={styles.alarmListContent}
      />

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
});