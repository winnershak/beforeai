import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Link, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Switch } from 'react-native';
import { scheduleAlarmNotification, requestNotificationPermissions } from './notifications';

export default function NewAlarmScreen() {
  const params = useLocalSearchParams();
  const isEditing = !!params.alarmId;

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
  const [isLabelModalVisible, setIsLabelModalVisible] = useState(false);

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

  const saveAlarm = async () => {
    try {
      const newAlarm = {
        id: isEditing ? String(params.alarmId) : Date.now().toString(),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        }),
        enabled: true,
        days: selectedDays.map(index => days[index].label),
        label: label || '',
        sound: selectedSound || 'orkney.wav',
        vibration: vibrationEnabled,
      };

      if (newAlarm.enabled) {
        await scheduleAlarmNotification(newAlarm);
      }

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
      router.push('/(tabs)');
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

  useEffect(() => {
    if (params.newLabel) {
      setLabel(params.newLabel as string);
    }
  }, [params.newLabel]);

  useEffect(() => {
    const requestPermissions = async () => {
      await requestNotificationPermissions();
    };
    requestPermissions();
  }, []);

  const LabelModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isLabelModalVisible}
      onRequestClose={() => setIsLabelModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Label</Text>
          <TextInput
            style={styles.labelInput}
            value={label}
            onChangeText={setLabel}
            placeholder="Enter label"
            placeholderTextColor="#666"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              onPress={() => setIsLabelModalVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setIsLabelModalVisible(false);
              }}
              style={[styles.modalButton, styles.saveButton]}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Alarm' : 'New Alarm'}
        </Text>
        <TouchableOpacity onPress={saveAlarm}>
          <Text style={styles.saveText}>Save</Text>
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

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionButton}
            onPress={() => router.push('/(tabs)')}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mission</Text>
              <Text style={styles.sectionValue}>{selectedMission || 'None'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
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
          <TouchableOpacity 
            style={styles.sectionButton}
            onPress={() => router.push({
              pathname: '/label',
              params: { currentLabel: label }
            })}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Label</Text>
              <Text style={styles.sectionValue}>{label || 'No label'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LabelModal />
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
  saveText: {
    color: '#0A84FF',
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
}); 