import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform, AppState } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

export default function SnoozeSleep() {
  const params = useLocalSearchParams();
  const totalMinutes = Number(params.minutes) || 5;
  const appState = useRef(AppState.currentState);
  
  // Calculate total seconds
  const totalSeconds = totalMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const progressValue = useSharedValue(0);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  
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
      
      // Navigate back to tabs
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error ending break:', error);
    }
  };
  
  // Store end time when component mounts
  useEffect(() => {
    const setEndTime = async () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + totalSeconds * 1000);
      setSnoozeEndTime(endTime);
      await AsyncStorage.setItem('snoozeEndTime', endTime.toISOString());
    };
    
    setEndTime();
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App has come to the foreground - recalculate time left
        updateRemainingTime();
      }
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Function to update remaining time based on stored end time
  const updateRemainingTime = async () => {
    try {
      const storedEndTime = await AsyncStorage.getItem('snoozeEndTime');
      if (storedEndTime) {
        const endTime = new Date(storedEndTime);
        const now = new Date();
        const diff = Math.floor((endTime.getTime() - now.getTime()) / 1000);
        
        if (diff <= 0) {
          // Time's up
          await AsyncStorage.removeItem('appBlockDisabledUntil');
          await AsyncStorage.removeItem('snoozeEndTime');
          router.push('/(tabs)');
        } else {
          setSecondsLeft(diff);
        }
      }
    } catch (error) {
      console.error('Error updating remaining time:', error);
    }
  };
  
  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Navigate back to tabs when time is up
          router.push('/(tabs)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
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
              onPress={() => router.push('/(tabs)')}
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