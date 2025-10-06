import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert, Linking, Platform, AppState } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { ShareModal } from './components/ShareModal';
import SystemVolumeModule from './native-modules/SystemVolumeModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AlarmSuccess() {
  const params = useLocalSearchParams();
  const passedTime = params.time as string;
  
  const successOpacity = useRef(new Animated.Value(0)).current;
  const storyViewRef = useRef<View>(null);
  const [showStoryView, setShowStoryView] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0, target: 8 });
  const [earlyBirdTarget, setEarlyBirdTarget] = useState(8); // Default to 8 AM
  const [hasShared, setHasShared] = useState(false);
  
  // Use passed time or current time as fallback
  const currentTime = passedTime || new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // Prevent screen from being killed when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        console.log('📱 App going to background - keeping alarm-success alive');
        // Save a flag that we're on alarm-success
        AsyncStorage.setItem('onAlarmSuccess', 'true');
      } else if (nextAppState === 'active') {
        console.log('📱 App coming back to foreground');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Clear the flag when user manually leaves
  useEffect(() => {
    return () => {
      AsyncStorage.removeItem('onAlarmSuccess');
    };
  }, []);

  useEffect(() => {
    const initializeSuccess = async () => {
      // Restore volume when success screen loads
      if (Platform.OS === 'ios') {
        try {
          await SystemVolumeModule.restoreOriginalVolume();
          console.log('🔊 Volume restored in alarm-success');
        } catch (error) {
          console.log('Volume restore failed:', error);
        }
      }
      
      // Load early bird target and streak data
      try {
        // Get user's early bird target (default 8 AM)
        const targetStr = await AsyncStorage.getItem('earlyBirdTarget');
        const earlyBirdTarget = targetStr ? parseInt(targetStr) : 8;
        
        const streakJson = await AsyncStorage.getItem('earlyWakeUpStreak');
        let streak = streakJson ? JSON.parse(streakJson) : { currentStreak: 0, longestStreak: 0, lastWakeUpDate: '' };
        
        // Check if wake-up is before target time
        const hours = new Date().getHours();
        const isEarlyBird = hours < earlyBirdTarget;
        
        if (isEarlyBird) {
          const today = new Date().toISOString().split('T')[0];
          
          // Only update if not already recorded today
          if (streak.lastWakeUpDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];
            
            if (streak.lastWakeUpDate === yesterdayString) {
              // Consecutive day - increment
              streak.currentStreak += 1;
            } else {
              // Streak broken or new - reset to 1
              streak.currentStreak = 1;
            }
            
            // Update longest streak
            streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
            streak.lastWakeUpDate = today;
            
            // Save updated streak
            await AsyncStorage.setItem('earlyWakeUpStreak', JSON.stringify(streak));
            console.log(`🔥 Early bird streak: ${streak.currentStreak} days (target: ${earlyBirdTarget}:00)`);
          }
        } else {
          console.log(`⏰ Wake-up at ${hours}:xx - no streak update (target: ${earlyBirdTarget}:00)`);
        }
        
        // Always set streak data for display, include target
        setStreakData({ ...streak, target: earlyBirdTarget });
        console.log(`📊 Loaded streak: ${streak.currentStreak} current, target: ${earlyBirdTarget}:00`);
      } catch (error) {
        console.error('Error with streak logic:', error);
      }
      
      // Fade in animation
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
    };
    
    initializeSuccess();
  }, []);

  // Save alarm-success state when app goes to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background') {
        console.log('📱 Saving alarm-success state');
        await AsyncStorage.setItem('alarmSuccessData', JSON.stringify({
          time: currentTime,
          streakData: streakData,
          timestamp: Date.now()
        }));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentTime, streakData]);

  // Prevent iOS from killing this screen when going to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 App state changed to:', nextAppState);
      // Just log it - don't do anything else
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const updateEarlyBirdTarget = async (hour: number) => {
    try {
      await AsyncStorage.setItem('earlyBirdTarget', hour.toString());
      setEarlyBirdTarget(hour);
      console.log(`Early bird target set to: ${hour}:00`);
    } catch (error) {
      console.error('Error saving early bird target:', error);
    }
  };

  const shareToInstagram = async () => {
    try {
      console.log('🎯 shareToInstagram FUNCTION CALLED');
      console.log('📱 Showing story view...');
      setShowStoryView(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('⏱️ After 2 second wait');
      
      if (!storyViewRef.current) {
        console.log('❌ Story view ref is null');
        Alert.alert('Error', 'Unable to create achievement image. Please try again.');
        return;
      }

      console.log('📸 About to capture image...');
      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('🖼️ Image captured, about to share...');
      const shareOptions = {
        stickerImage: uri,
        social: Share.Social.INSTAGRAM_STORIES as any,
        appId: '1104244401532187',
        backgroundBottomColor: '#1a1a2e',
        backgroundTopColor: '#1a1a2e',
      };
      
      await Share.shareSingle(shareOptions);
      console.log('✅ SHARE COMPLETED - setting hasShared to true');
      
      setHasShared(true);
      setShowStoryView(false);
      console.log('🎉 shareToInstagram function completed successfully');
      
    } catch (error: any) {
      console.error('💥 Error in shareToInstagram:', error);
      setShowStoryView(false);
      Alert.alert('Sharing Error', 'Unable to share your achievement. Please try again.');
    }
  };

  const handleResetStreak = () => {
    Alert.alert(
      'Reset Streak?',
      'This will permanently reset your early bird streak to 0. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('earlyWakeUpStreak');
              Alert.alert('Success', 'Your streak has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset streak.');
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'slide_from_bottom',
        }} 
      />
      
      <Animated.View style={[styles.container, { opacity: successOpacity }]}>
        <ConfettiCannon
          count={100}
          origin={{x: screenWidth/2, y: 0}}
          explosionSpeed={300}
          fallSpeed={2500}
          colors={['#00FFFF', '#800080', '#FFFF00', '#00FF00', '#FF0000']}
        />
        
        <View style={styles.content}>
          <Ionicons name="sunny" size={80} color="#FFD700" />
          <Text style={styles.title}>Good Morning!</Text>
          <Text style={styles.time}>Woke up at {currentTime}</Text>
          
          {/* Early Bird Streak Display */}
          {new Date().getHours() < (streakData.target || 8) && streakData.currentStreak > 0 && (
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>
                {streakData.currentStreak} day early bird streak!
              </Text>
              <Text style={styles.streakTarget}>
                Target: {streakData.target || 8}:00 AM
              </Text>
            </View>
          )}
          
          <Text style={styles.subtitle}>You're awake! </Text>
          
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={() => {
              console.log('🎯 SHARE BUTTON PRESSED');
              setShowShareModal(true);
            }}
          >
            <Ionicons name="share" size={24} color="#fff" />
            <Text style={styles.shareText}>
              {hasShared ? 'Share Again' : 'Share Achievement'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skipText}>
              {hasShared ? 'Done' : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ShareModal
        visible={showShareModal}
        onClose={() => {
          console.log('🚫 ShareModal CLOSED');
          setShowShareModal(false);
        }}
        wakeUpTime={currentTime}
        onShareToJournal={() => {
          console.log('📝 JOURNAL SHARE CLICKED');
          setShowShareModal(false);
          // Don't navigate to journal - keep alarm-success alive
        }}
      />

      {/* Only show story view when sharing */}
      {showStoryView && (
        <View 
          ref={storyViewRef}
          style={styles.fullScreenStory}
        >
          <View style={styles.centerContent}>
            <Text style={styles.timeText}>⏰ {currentTime}</Text>
            {streakData.currentStreak > 0 && (
              <Text style={styles.streakStoryText}>
                🔥 {streakData.currentStreak} day streak!
              </Text>
            )}
            <Text style={styles.brandingText}>by Bliss Alarm</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  time: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 40,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4405F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipText: {
    color: '#888',
    fontSize: 14,
  },
  
  // Hidden story view for capture
  fullScreenStory: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#6B46C1', // Beautiful purple
    zIndex: 1000,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 1,
  },
  centerContent: {
    alignItems: 'center',
  },
  timeText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  generatedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.7,
    letterSpacing: 1,
  },
  // Add streak styles
  streakContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  streakEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  streakTarget: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  settingSubtext: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  targetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetTime: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 60,
    textAlign: 'center',
  },
  streakStoryText: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  dangerItem: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  dangerText: {
    color: '#FF3B30',
  },
}); 