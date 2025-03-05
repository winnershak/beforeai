import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuizQuestion8() {
  const [weekdayBedtime, setWeekdayBedtime] = useState(new Date(new Date().setHours(22, 0, 0, 0)));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const handleContinue = async () => {
    try {
      // Save weekday bedtime to AsyncStorage
      await AsyncStorage.setItem('quiz_weekday_bedtime', weekdayBedtime.toISOString());
      console.log('Weekday bedtime saved, navigating to question9');
      
      // Add a small delay to ensure the navigation works
      setTimeout(() => {
        // Navigate to weekend question with explicit path
        router.push('/quiz/question9');
      }, 100);
    } catch (error) {
      console.error('Error saving weekday bedtime:', error);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || weekdayBedtime;
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
    setWeekdayBedtime(currentDate);
  };

  useEffect(() => {
    console.log('Question 8 screen mounted');
    return () => {
      console.log('Question 8 screen unmounted');
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ImageBackground 
        source={require('../../assets/images/1.webp')}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: '87.5%' }]} />
                </View>
              </View>
            </View>
            
            <View style={styles.content}>
              <Text style={styles.question}>What time do you usually go to sleep on weekdays?</Text>
              
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{formatTime(weekdayBedtime)}</Text>
              </View>
              
              {(showPicker || Platform.OS === 'ios') && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={weekdayBedtime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                    textColor="#fff"
                    style={styles.timePicker}
                  />
                </View>
              )}
              
              {Platform.OS === 'android' && !showPicker && (
                <TouchableOpacity 
                  style={styles.editTimeButton}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={styles.editTimeButtonText}>Change Time</Text>
                  <Ionicons name="time-outline" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.footer} />
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Darker overlay for better visibility
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progress: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  question: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: isSmallDevice ? 32 : 36,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timeDisplay: {
    backgroundColor: 'rgba(10,132,255,0.2)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#0A84FF',
  },
  timeText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  pickerContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.5)' : 'transparent',
    borderRadius: 15,
    width: '100%',
    marginBottom: 30,
    overflow: 'hidden',
  },
  timePicker: {
    width: Platform.OS === 'ios' ? '100%' : 140,
    height: 180,
  },
  editTimeButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  editTimeButtonText: {
    color: '#fff',
    fontSize: 18,
    marginRight: 10,
  },
  continueButton: {
    backgroundColor: '#0A84FF',
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  footer: {
    padding: 20,
  },
}); 