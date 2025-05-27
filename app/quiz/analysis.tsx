import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ProgressBar = ({ progress, label }: { progress: number; label: string }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressItem}>
      <View style={styles.progressLabelContainer}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressPercentage}>{`${Math.round(progress)}%`}</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBarForeground, { width: widthInterpolated }]} />
      </View>
    </View>
  );
};

export default function AnalysisScreen() {
  const [wakeUpProgress, setWakeUpProgress] = useState(0);
  const [scheduleProgress, setScheduleProgress] = useState(0);
  const [isCalculationComplete, setIsCalculationComplete] = useState(false);
  const overallProgress = (wakeUpProgress + scheduleProgress) / 2;

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    // Simulate progress, making it take a bit longer to feel more "calculated"
    // Stage 1
    timers.push(setTimeout(() => setWakeUpProgress(25), 500));
    timers.push(setTimeout(() => setScheduleProgress(15), 800));
    // Stage 2
    timers.push(setTimeout(() => setWakeUpProgress(60), 1500));
    timers.push(setTimeout(() => setScheduleProgress(50), 1800));
    // Stage 3
    timers.push(setTimeout(() => setWakeUpProgress(90), 2500));
    timers.push(setTimeout(() => setScheduleProgress(80), 2800));
    // Final
    timers.push(setTimeout(() => {
      setWakeUpProgress(100);
      setScheduleProgress(100);
      setIsCalculationComplete(true); // Mark calculation as complete
    }, 3500)); // Total time for calculation simulation

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleFindOut = () => {
    router.replace('/quiz/yes'); // Navigate to the YES (paywall) screen
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Analyzing Your Needs</Text>

          <View style={styles.progressContainer}>
            <ProgressBar progress={wakeUpProgress} label="Ideal Wake Up Time" />
            <ProgressBar progress={scheduleProgress} label="Ideal Sleep Schedule" />
          </View>

          <View style={styles.statusTextContainer}>
            {!isCalculationComplete ? (
              <Text style={styles.statusText}>
                Hang tight! We're personalizing your sleep insights...
              </Text>
            ) : (
              <Text style={styles.statusText}>
                We've calculated your ideal sleep time and wake up time!
              </Text>
            )}
          </View>
        </View>
        {/* Sticky button appears when calculation is complete */}
        {isCalculationComplete && (
          <View style={styles.stickyButtonContainer}>
            <TouchableOpacity
              style={styles.findOutButton}
              onPress={handleFindOut}
            >
              <Text style={styles.findOutButtonText}>Find Out!</Text>
              <Ionicons name="sparkles-outline" size={22} color="#000" style={{ marginLeft: 8 }}/>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the sticky button
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 50, // Increased margin
  },
  progressContainer: {
    width: '100%',
    marginBottom: 50, // Increased margin
  },
  progressItem: {
    marginBottom: 30, // Increased margin
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, // Increased margin
  },
  progressLabel: {
    fontSize: 17, // Slightly larger
    color: '#E0E0E0',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 17, // Slightly larger
    color: '#0A84FF',
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 14, // Slightly thicker
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 7, // Adjusted border radius
    overflow: 'hidden',
  },
  progressBarForeground: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 7, // Adjusted border radius
  },
  statusTextContainer: {
    minHeight: 50, // Ensure space for text
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#B0B0B0',
    fontSize: 18, // Slightly larger
    fontWeight: '500',
    textAlign: 'center',
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 30, // More padding for safe area
    backgroundColor: 'rgba(0,0,0,0.9)', // To make it visible if content scrolls under
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  findOutButton: {
    backgroundColor: '#0A84FF', // Consistent button color
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  findOutButtonText: {
    color: '#FFFFFF', // Changed text to white for better contrast on blue
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 