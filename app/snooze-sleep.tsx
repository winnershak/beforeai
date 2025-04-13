import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform, AppState, NativeModules } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

// Import ScreenTimeBridge from NativeModules
const { ScreenTimeBridge } = NativeModules;

export default function SnoozeSleep() {
  const params = useLocalSearchParams();
  const minutes = Number(params.minutes) || 5;
  const totalSeconds = minutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const progressValue = useSharedValue(0);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const [isTimerComplete, setIsTimerComplete] = useState(false);
  
  // Store end time in AsyncStorage when component mounts
  useEffect(() => {
    const now = new Date();
    const endTime = new Date(now.getTime() + totalSeconds * 1000);
    setSnoozeEndTime(endTime);
    
    // Store end time in AsyncStorage
    AsyncStorage.setItem('snoozeEndTime', endTime.toISOString());
    
    // Also store the schedule ID if available
    if (params.scheduleId) {
      AsyncStorage.setItem('snoozedScheduleId', params.scheduleId as string);
    }
  }, [totalSeconds, params.scheduleId]);
  
  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App has come to the foreground - check if snooze time is up
        const checkSnoozeTime = async () => {
          const storedEndTimeStr = await AsyncStorage.getItem('snoozeEndTime');
          if (storedEndTimeStr) {
            const endTime = new Date(storedEndTimeStr);
            const now = new Date();
            
            if (now >= endTime) {
              // Snooze time is up
              setIsTimerComplete(true);
            } else {
              // Update seconds left
              const newSecondsLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
              setSecondsLeft(newSecondsLeft);
            }
          }
        };
        
        checkSnoozeTime();
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Timer effect - only runs when app is in foreground
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Handle navigation when timer completes
  useEffect(() => {
    if (isTimerComplete) {
      const handleTimerComplete = async () => {
        try {
          // Clean up AsyncStorage
          await AsyncStorage.removeItem('snoozeEndTime');
          
          // Get the snoozed schedule ID if available
          const scheduleId = await AsyncStorage.getItem('snoozedScheduleId');
          if (scheduleId) {
            console.log(`Snooze ended, reapplying block for schedule: ${scheduleId}`);
            
            // Remove the disabled timestamp
            await AsyncStorage.removeItem('appBlockDisabledUntil');
            
            // Reapply the block by removing the snooze
            if (Platform.OS === 'ios') {
              try {
                await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, 0);
                console.log('Successfully reapplied block');
              } catch (error) {
                console.error('Error reapplying block:', error);
              }
            }
            
            // Clean up the stored schedule ID
            await AsyncStorage.removeItem('snoozedScheduleId');
          }
          
          // Navigate back to tabs
          router.push('/(tabs)');
        } catch (error) {
          console.error('Error handling timer completion:', error);
          // Still navigate even if there's an error
          router.push('/(tabs)');
        }
      };
      
      handleTimerComplete();
    }
  }, [isTimerComplete]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle end break early
  const handleEndBreak = async () => {
    try {
      // Remove the disabled timestamp
      await AsyncStorage.removeItem('appBlockDisabledUntil');
      await AsyncStorage.removeItem('snoozeEndTime');
      
      // Store that we manually ended the snooze
      await AsyncStorage.setItem('manuallyEndedSnooze', 'true');
      
      // Navigate back to tabs
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error ending break:', error);
    }
  };
  
  // Handle go home without ending snooze
  const handleGoHome = () => {
    // Just navigate to tabs without ending the snooze
    router.push('/(tabs)');
  };
  
  // Update progress bar
  useEffect(() => {
    const progress = (totalSeconds - secondsLeft) / totalSeconds;
    progressValue.value = withTiming(progress, { duration: 1000 });
  }, [secondsLeft, totalSeconds]);
  
  // Animated style for progress bar
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ImageBackground 
        source={require('../assets/images/snoozetime.png')} 
        style={styles.background}
        resizeMode="cover"
      >
        <BlurView intensity={10} tint="dark" style={styles.overlay}>
          <View style={styles.contentContainer}>
            <View style={styles.timeContainer}>
              <Text style={styles.smallTimeText}>{formatTime(secondsLeft)}</Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[styles.progressBar, animatedProgressStyle]} 
              />
            </View>
            
            <TouchableOpacity 
              style={styles.homeButton}
              onPress={handleGoHome}
            >
              <Ionicons name="home-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Go Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.endButton}
              onPress={handleEndBreak}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>End Break</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  smallTimeText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0A84FF',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
  },
  homeButton: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: '#3A3A3C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 