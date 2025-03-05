import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationTriggerInput } from 'expo-notifications';
import NotificationService from '../services/NotificationService';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Day names for display
const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function BedtimeScreen() {
  // State for bedtime
  const [bedtime, setBedtime] = useState(new Date(new Date().setHours(22, 0, 0, 0)));
  const [isEnabled, setIsEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState([true, true, true, true, true, true, true]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Load saved settings
  useEffect(() => {
    loadSettings();
    requestNotificationPermission();
  }, []);
  
  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Please allow notifications to receive bedtime reminders');
    }
  };
  
  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('bedtimeSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setBedtime(new Date(parsedSettings.bedtime));
        setIsEnabled(parsedSettings.isEnabled);
        setSelectedDays(parsedSettings.selectedDays);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  const saveSettings = async () => {
    try {
      const settings = {
        bedtime: bedtime.toISOString(),
        isEnabled,
        selectedDays,
      };
      await AsyncStorage.setItem('bedtimeSettings', JSON.stringify(settings));
      
      // Schedule notifications if enabled
      if (isEnabled) {
        await scheduleNotifications();
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      
      // Show a subtle confirmation instead of an alert
      // This could be a toast or a temporary message
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };
  
  const scheduleNotifications = async () => {
    try {
      // Cancel existing notifications first
      await NotificationService.cancelAllNotifications();
      
      if (!isEnabled) return;
      
      console.log(`Scheduling bedtime notifications for ${formatTime(bedtime)}`);
      
      // Schedule for each selected day
      for (let i = 0; i < 7; i++) {
        if (selectedDays[i]) {
          const weekday = i + 1 === 7 ? 1 : i + 1; // Convert to 1-7 format where 1 is Monday
          
          await NotificationService.scheduleBedtimeNotification(
            bedtime.getHours(),
            bedtime.getMinutes(),
            weekday,
            `Time to disconnect and prepare for sleep! (${dayNames[i]})`
          );
        }
      }
      
      // Verify notifications were scheduled
      const scheduledNotifications = await NotificationService.getAllScheduledNotifications();
      console.log(`Successfully scheduled ${scheduledNotifications.length} notifications`);
      
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };
  
  const toggleDay = (index: number) => {
    const newSelectedDays = [...selectedDays];
    newSelectedDays[index] = !newSelectedDays[index];
    setSelectedDays(newSelectedDays);
    
    // Auto-save when days are toggled
    setTimeout(() => saveSettings(), 100);
  };
  
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setBedtime(selectedTime);
      
      // Auto-save when time changes
      setTimeout(() => saveSettings(), 100);
    }
  };
  
  // Quick preset functions
  const setWeekdaysOnly = () => {
    setSelectedDays([false, true, true, true, true, true, false]);
    setTimeout(() => saveSettings(), 100);
  };
  
  const setWeekendsOnly = () => {
    setSelectedDays([true, false, false, false, false, false, true]);
    setTimeout(() => saveSettings(), 100);
  };
  
  const setAllDays = () => {
    setSelectedDays([true, true, true, true, true, true, true]);
    setTimeout(() => saveSettings(), 100);
  };
  
  // Fix the time picker functionality and improve UI
  const handleTimePress = () => {
    if (Platform.OS === 'ios') {
      // For iOS, we'll show the time picker inline
      setShowTimePicker(!showTimePicker);
    } else {
      // For Android, the DateTimePicker will show as a modal
      setShowTimePicker(true);
    }
  };
  
  // Add this function to test notifications immediately
  const testNotification = async () => {
    try {
      const result = await NotificationService.scheduleTestNotification();
      if (result) {
        Alert.alert('Test Notification Sent', 'You should receive a notification immediately.');
      } else {
        Alert.alert('Error', 'Failed to send test notification. Please check permissions.');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to send test notification: ' + error);
    }
  };
  
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Bedtime',
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
      }} />
      
      <SafeAreaView style={styles.container}>
        {/* Main card with all controls */}
        <View style={styles.mainCard}>
          {/* Header with toggle */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="moon" size={24} color="#8e8eff" />
              <Text style={styles.headerTitle}>Bedtime Reminder</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(value) => {
                setIsEnabled(value);
                setTimeout(() => saveSettings(), 100);
              }}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isEnabled ? '#0A84FF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
          
          {/* Time display and picker */}
          <View style={styles.timeContainer}>
            <Text style={[styles.timeLabel, !isEnabled && styles.disabledText]}>
              I want to go to bed at
            </Text>
            
            <TouchableOpacity 
              style={[styles.timeDisplay, !isEnabled && styles.disabledTimeDisplay]}
              onPress={handleTimePress}
              disabled={!isEnabled}
            >
              <Text style={[styles.timeText, !isEnabled && styles.disabledText]}>
                {formatTime(bedtime)}
              </Text>
              <Ionicons 
                name="time-outline" 
                size={24} 
                color={isEnabled ? "#0A84FF" : "#666"} 
                style={styles.timeIcon} 
              />
            </TouchableOpacity>
            
            {/* Show time picker for iOS inline */}
            {showTimePicker && Platform.OS === 'ios' && (
              <View style={styles.iosPickerContainer}>
                <DateTimePicker
                  value={bedtime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.iosPicker}
                />
              </View>
            )}
            
            {/* Add this for Android time picker */}
            {showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={bedtime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>
          
          {/* Day selection */}
          <View style={styles.daysSection}>
            <Text style={[styles.daysLabel, !isEnabled && styles.disabledText]}>
              Remind me on
            </Text>
            <View style={styles.daysContainer}>
              {dayNames.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    selectedDays[index] && styles.selectedDay,
                    !isEnabled && styles.disabledDayButton
                  ]}
                  onPress={() => toggleDay(index)}
                  disabled={!isEnabled}
                >
                  <Text style={[
                    styles.dayText,
                    selectedDays[index] && styles.selectedDayText,
                    !isEnabled && styles.disabledText
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Quick presets */}
          <View style={styles.presetContainer}>
            <TouchableOpacity
              style={[styles.presetButton, !isEnabled && styles.disabledPresetButton]}
              onPress={setWeekdaysOnly}
              disabled={!isEnabled}
            >
              <Text style={[styles.presetButtonText, !isEnabled && styles.disabledText]}>
                Weekdays
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.presetButton, !isEnabled && styles.disabledPresetButton]}
              onPress={setWeekendsOnly}
              disabled={!isEnabled}
            >
              <Text style={[styles.presetButtonText, !isEnabled && styles.disabledText]}>
                Weekends
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.presetButton, !isEnabled && styles.disabledPresetButton]}
              onPress={setAllDays}
              disabled={!isEnabled}
            >
              <Text style={[styles.presetButtonText, !isEnabled && styles.disabledText]}>
                Every Day
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={22} color="#0A84FF" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              You'll receive a notification at your set bedtime on the days you've selected to help you disconnect and prepare for sleep.
            </Text>
          </View>
        </View>
        
        {/* Test button */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={testNotification}
        >
          <Text style={styles.testButtonText}>Test Notification</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timeContainer: {
    marginBottom: 24,
  },
  timeLabel: {
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,132,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  timeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  timeIcon: {
    marginLeft: 8,
  },
  daysSection: {
    marginBottom: 24,
  },
  daysLabel: {
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#2c2c2e',
  },
  selectedDay: {
    backgroundColor: '#0A84FF',
  },
  dayText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  selectedDayText: {
    fontWeight: 'bold',
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  presetButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  disabledText: {
    color: '#666',
  },
  disabledTimeDisplay: {
    borderColor: '#444',
    backgroundColor: 'rgba(60,60,60,0.15)',
  },
  disabledDayButton: {
    backgroundColor: '#222',
  },
  disabledPresetButton: {
    backgroundColor: '#222',
  },
  iosPickerContainer: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  iosPicker: {
    height: 180,
    width: '100%',
  },
  testButton: {
    backgroundColor: '#0A84FF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 