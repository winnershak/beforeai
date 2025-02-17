import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Link, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Switch } from 'react-native';

export default function NewAlarmScreen() {
  const params = useLocalSearchParams();
  const isEditing = params.editMode === 'true';

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
  const [selectedMission, setSelectedMission] = useState('Listerine');
  const [volume, setVolume] = useState(0.5);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('Orkney');
  const [missionIcon, setMissionIcon] = useState('calculator');
  const [missionColor, setMissionColor] = useState('#4CAF50');
  const [label, setLabel] = useState('');

  const days = [
    { id: '0', label: 'S' },
    { id: '1', label: 'M' },
    { id: '2', label: 'T' }, // First T for Tuesday
    { id: '3', label: 'W' },
    { id: '4', label: 'T' }, // Second T for Thursday
    { id: '5', label: 'F' },
    { id: '6', label: 'S' },
  ];

  const calculateRingTime = () => {
    const now = new Date();
    const alarmTime = new Date(date);
    const timeDiff = alarmTime.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `Ring in ${hours}hrs ${minutes}min`;
  };

  const saveAlarm = async () => {
    try {
      const newAlarm = {
        id: isEditing ? params.alarmId : Date.now().toString(),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        }),
        enabled: true,
        days: selectedDays.map(index => days[index].label),
        mission: selectedMission || '',
        missionIcon: selectedMission ? missionIcon : '',
        missionColor: selectedMission ? missionColor : '',
        sound: selectedSound,
        volume,
        vibration: vibrationEnabled,
        label: label || '',
      };

      const existingAlarms = await AsyncStorage.getItem('alarms');
      let alarms = existingAlarms ? JSON.parse(existingAlarms) : [];
      
      if (isEditing) {
        alarms = alarms.map((alarm: any) => 
          alarm.id === params.alarmId ? newAlarm : alarm
        );
      } else {
        alarms.push(newAlarm);
      }
      
      await AsyncStorage.setItem('alarms', JSON.stringify(alarms));
      router.back();
    } catch (error) {
      console.error('Error saving alarm:', error);
    }
  };

  const toggleDaily = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  useEffect(() => {
    if (params.missionIcon) setMissionIcon(params.missionIcon as string);
    if (params.missionColor) setMissionColor(params.missionColor as string);
  }, [params]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Ring in {calculateRingTime()}
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
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily</Text>
            <TouchableOpacity 
              onPress={toggleDaily}
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
            {days.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDays.includes(Number(day.id)) && styles.selectedDay,
                ]}
                onPress={() => {
                  if (selectedDays.includes(Number(day.id))) {
                    setSelectedDays(selectedDays.filter(d => d !== Number(day.id)));
                  } else {
                    setSelectedDays([...selectedDays, Number(day.id)]);
                  }
                }}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays.includes(Number(day.id)) && styles.selectedDayText
                ]}>{day.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mission</Text>
            <Text style={styles.missionCount}>{selectedMission ? '1/5' : '0/5'}</Text>
          </View>
          <View style={styles.missionGrid}>
            <Link href="/(missions)" asChild>
              <TouchableOpacity style={styles.missionBox}>
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </Link>
            <View style={[styles.missionBox, styles.missionBoxDisabled]}>
              <Ionicons name="add" size={24} color="#444" />
            </View>
            <View style={[styles.missionBox, styles.missionBoxDisabled]}>
              <Ionicons name="add" size={24} color="#444" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sound</Text>
            <Link href="/sounds" asChild>
              <TouchableOpacity>
                <Text style={styles.soundName}>{selectedSound} ›</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View style={styles.soundControls}>
            <View style={styles.volumeContainer}>
              <Ionicons name="volume-low" size={24} color="#fff" />
              <Slider
                style={styles.slider}
                value={volume}
                onValueChange={setVolume}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor="#00BCD4"
                maximumTrackTintColor="#333"
                thumbTintColor="#fff"
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Label</Text>
            <TouchableOpacity 
              onPress={() => {/* Add label modal or navigation */}}
              style={styles.labelButton}
            >
              <Text style={styles.labelText}>
                {label || 'No label'} ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveAlarm}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
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
    color: '#00BCD4',
    fontSize: 17,
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
  slider: {
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
  labelButton: {
    padding: 8,
  },
  labelText: {
    color: '#666',
    fontSize: 17,
  },
}); 