import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ImageBackground, Alert, Platform, NativeModules, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';

const { ScreenTimeBridge } = NativeModules;

export default function BreatheScreen() {
  // States
  const [breathingComplete, setBreathingComplete] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(6);
  const [canContinue, setCanContinue] = useState(false);
  const progressWidth = useSharedValue(0);
  const [breatheState, setBreatheState] = useState('in'); // 'in' or 'out'
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [selectedSnoozeMinutes, setSelectedSnoozeMinutes] = useState<number>(5);
  
  // Available snooze durations in minutes
  const snoozeDurations = Array.from({ length: 15 }, (_, i) => i + 1);
  
  // Load the current schedule ID
  useEffect(() => {
    const getScheduleId = async () => {
      const id = await AsyncStorage.getItem('currentBlockScheduleId');
      setScheduleId(id);
    };
    getScheduleId();
  }, []);
  
  // Start breathing timer when component mounts
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanContinue(true);
          return 0;
        }
        
        // Toggle between breathe in/out every 3 seconds
        if (prev % 3 === 0) {
          setBreatheState(current => current === 'in' ? 'out' : 'in');
        }
        
        // Update progress bar
        progressWidth.value = withTiming((6 - prev + 1) / 6, { duration: 1000 });
        
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Animated style for progress bar
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value * 100}%`,
    };
  });
  
  // Function to stop video audio
  const stopAudio = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.stopAsync();
      } catch (error) {
        console.log('Error stopping video:', error);
      }
    }
  };
  
  // Function to handle "Nevermind" - go back to tabs
  const handleNevermind = () => {
    stopAudio();
    router.push('/(tabs)');
  };
  
  // Function to handle Continue button press
  const handleContinue = () => {
    if (canContinue) {
      stopAudio();
      setBreathingComplete(true);
    }
  };
  
  // Function to handle "Take a break" - permanently disable this specific app block
  const handleTakeBreak = async () => {
    try {
      if (!scheduleId) {
        console.error('No schedule ID available');
        router.push('/(tabs)');
        return;
      }
      
      // Get all schedules
      const schedulesJson = await AsyncStorage.getItem('appBlockSchedules');
      if (!schedulesJson) {
        console.error('No schedules found');
        router.push('/(tabs)');
        return;
      }
      
      // Parse schedules and find the current one to disable
      const schedules = JSON.parse(schedulesJson);
      const updatedSchedules = schedules.map((schedule: any) => {
        if (schedule.id === scheduleId) {
          // Set this specific schedule to inactive
          return {
            ...schedule,
            isActive: false
          };
        }
        return schedule;
      });
      
      // Save the updated schedules
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(updatedSchedules));
      
      // If on iOS, stop monitoring for this specific schedule
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // First try with 0 minutes
          await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, 0);
          
          // Also try with a very large number to ensure it's stopped
          await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, 999999);
          
          console.log("Monitoring stopped permanently for schedule:", scheduleId);
          
          // Force a refresh of all schedules to ensure this one is removed
          if (ScreenTimeBridge.refreshSchedules) {
            await ScreenTimeBridge.refreshSchedules();
          }
        } catch (error) {
          console.error("Error stopping monitoring:", error);
        }
      }
      
      Alert.alert(
        "Block Ended",
        "This focus time is now inactive. You can re-enable it from the App Block screen.",
        [{ text: "OK", onPress: () => router.push('/(tabs)') }]
      );
    } catch (error) {
      console.error('Error ending app block:', error);
      router.push('/(tabs)');
    }
  };
  
  // Function to navigate to edit session
  const handleEditSession = () => {
    if (scheduleId) {
      router.push(`/appblock/edit?id=${scheduleId}`);
    } else {
      router.push('/appblock/edit');
    }
  };
  
  // Function to handle snooze selection
  const handleSnoozeSelect = (minutes: number) => {
    setSelectedSnoozeMinutes(minutes);
    handleSnooze(minutes);
    setShowSnoozePicker(false);
  };
  
  // Function to apply snooze for selected duration
  const handleSnooze = async (minutes: number) => {
    try {
      // Set a disable until timestamp (now + selected minutes)
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
      
      await AsyncStorage.setItem('appBlockDisabledUntil', snoozeUntil.toISOString());
      
      // If on iOS, stop monitoring for this specific schedule
      // Pass the actual minutes for the snooze duration
      if (Platform.OS === 'ios' && ScreenTimeBridge && scheduleId) {
        try {
          await ScreenTimeBridge.stopMonitoringForSchedule(scheduleId, minutes);
          console.log("Monitoring stopped for schedule:", scheduleId, "for", minutes, "minutes");
        } catch (error) {
          console.error("Error stopping monitoring:", error);
        }
      }
      
      // Navigate to snooze-sleep screen with duration
      router.push(`/snooze-sleep?minutes=${minutes}`);
    } catch (error) {
      console.error('Error applying snooze:', error);
    }
  };
  
  // Apply selected snooze duration
  const applySnooze = () => {
    handleSnooze(selectedSnoozeMinutes);
    setShowSnoozePicker(false);
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {!breathingComplete ? (
        // Breathing Exercise State with Video
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={require('../assets/images/delay.mp4')}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            style={styles.video}
          />
          <View style={styles.videoOverlay}>
            <View style={styles.stickyButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.continueButton,
                  !canContinue && styles.continueButtonDisabled
                ]}
                onPress={handleContinue}
                disabled={!canContinue}
              >
                <View style={styles.progressBarContainer}>
                  <Animated.View 
                    style={[styles.progressBar, animatedProgressStyle]} 
                  />
                </View>
                <Text style={styles.continueText}>
                  Continue {secondsLeft > 0 ? `(${secondsLeft}s)` : ''}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.nevermindButton,
                  canContinue && styles.nevermindButtonDanger
                ]}
                onPress={handleNevermind}
              >
                <Text style={styles.nevermindText}>Nevermind</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // Decision Options State with Ship Background
        <ImageBackground 
          source={require('../assets/images/ship.png')} 
          style={styles.imageBackground}
          resizeMode="cover">
          <View style={styles.imageOverlay}>
            {/* Small Edit button at top right */}
            <TouchableOpacity 
              style={styles.smallEditButton}
              onPress={handleEditSession}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={styles.smallEditButtonText}>Edit Session</Text>
            </TouchableOpacity>
            
            <Text style={styles.titleText}>How would you like to proceed?</Text>
            
            {/* Bottom buttons similar to first state */}
            <View style={styles.stickyButtonContainer}>
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={() => setShowSnoozePicker(true)}
              >
                <Text style={styles.continueText}>Snooze</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.nevermindButton}
                onPress={handleTakeBreak}
              >
                <Text style={styles.nevermindText}>Take a break for today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      )}
      
      {/* Snooze Duration Picker Modal */}
      <Modal
        visible={showSnoozePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSnoozePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity 
                onPress={() => setShowSnoozePicker(false)}
                style={styles.pickerButton}
              >
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={styles.pickerTitle}>Snooze Duration</Text>
              
              <View style={styles.pickerButton} />
            </View>
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSnoozeMinutes}
                onValueChange={(itemValue: number | string) => setSelectedSnoozeMinutes(Number(itemValue))}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {snoozeDurations.map((minutes) => (
                  <Picker.Item 
                    key={minutes.toString()} 
                    label={`${minutes} minute${minutes !== 1 ? 's' : ''}`} 
                    value={minutes} 
                  />
                ))}
              </Picker>
            </View>
            
            <View style={styles.selectButtonContainer}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={applySnooze}
              >
                <Text style={styles.selectButtonText}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  videoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  breatheCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(10, 132, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  breatheText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  nevermindButton: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
    alignItems: 'center',
  },
  nevermindButtonDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  nevermindText: {
    color: '#fff',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(10, 132, 255, 0.4)',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    zIndex: 2,
  },
  decisionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: 'rgba(10, 132, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 15,
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
    flexDirection: 'column',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  smallEditButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    zIndex: 10,
  },
  smallEditButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    padding: 0,
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pickerButton: {
    padding: 4,
  },
  pickerCancelText: {
    color: '#FF453A',
    fontSize: 17,
  },
  pickerContainer: {
    backgroundColor: '#2C2C2E',
  },
  picker: {
    width: '100%',
    height: 216,
  },
  pickerItem: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  selectButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
    width: '100%',
  },
  selectButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 