import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';

export default function SleepTimeScreen() {
  const router = useRouter();
  const [sleepTime, setSleepTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState([false, false, false, false, false, false, false]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [networkState, setNetworkState] = useState({
    isConnected: false,
    type: 'unknown',
    isWifi: false
  });

  // Load saved sleep settings
  useEffect(() => {
    loadSleepSettings();
    
    // Subscribe to network info
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log("Network state changed:", state);
      setNetworkState({
        isConnected: state.isConnected || false,
        type: state.type,
        isWifi: state.type === 'wifi'
      });
    });
    
    // Initial network status
    NetInfo.fetch().then(state => {
      console.log("Initial network state:", state);
      setNetworkState({
        isConnected: state.isConnected || false,
        type: state.type,
        isWifi: state.type === 'wifi'
      });
    });
    
    return () => {
      // Clean up the subscription
      unsubscribe();
    };
  }, []);

  const loadSleepSettings = async () => {
    try {
      const sleepSettingsJson = await AsyncStorage.getItem('sleepSettings');
      if (sleepSettingsJson) {
        const settings = JSON.parse(sleepSettingsJson);
        if (settings.time) {
          setSleepTime(new Date(settings.time));
        }
        if (settings.days) {
          setSelectedDays(settings.days);
        }
        if (settings.enabled !== undefined) {
          setIsEnabled(settings.enabled);
        }
      }
    } catch (error) {
      console.error('Error loading sleep settings:', error);
    }
  };

  const saveSleepSettings = async () => {
    try {
      const settings = {
        time: sleepTime.toISOString(),
        days: selectedDays,
        enabled: isEnabled
      };
      await AsyncStorage.setItem('sleepSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving sleep settings:', error);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const newSelectedDays = [...selectedDays];
    newSelectedDays[dayIndex] = !newSelectedDays[dayIndex];
    setSelectedDays(newSelectedDays);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSleepTime(selectedTime);
    }
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

  // Get day names for display
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get formatted network type display
  const getNetworkTypeDisplay = () => {
    if (!networkState.isConnected) return 'disconnected';
    
    switch(networkState.type) {
      case 'wifi': return 'connected to WiFi';
      case 'cellular': return 'using cellular data';
      case 'ethernet': return 'connected via ethernet';
      case 'vpn': return 'using VPN';
      default: return `connected (${networkState.type})`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sleep Time</Text>
        <Switch
          value={isEnabled}
          onValueChange={(value) => {
            setIsEnabled(value);
            saveSleepSettings();
          }}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When should you be sleeping?</Text>
          
          <TouchableOpacity 
            style={styles.timeSelector}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.timeText}>{formatTime(sleepTime)}</Text>
          </TouchableOpacity>
          
          {showTimePicker && (
            <DateTimePicker
              value={sleepTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Which days?</Text>
          <View style={styles.daysContainer}>
            {dayNames.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  selectedDays[index] && styles.selectedDay
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text 
                  style={[
                    styles.dayText,
                    selectedDays[index] && styles.selectedDayText
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network Status</Text>
          <Text style={styles.statusText}>
            Currently {getNetworkTypeDisplay()}
          </Text>
          <Text style={styles.infoText}>
            Your sleep time reminder will check if you're online
            at your scheduled sleep time and remind you to go to sleep.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveSleepSettings}
        >
          <Text style={styles.saveButtonText}>Save Sleep Settings</Text>
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 999,
    marginBottom: 10,
  },
  selectedDay: {
    backgroundColor: '#0A84FF',
  },
  dayText: {
    color: '#fff',
    fontSize: 12,
  },
  selectedDayText: {
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 