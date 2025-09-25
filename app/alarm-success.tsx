import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert, Linking, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { ShareModal } from './components/ShareModal';
import SystemVolumeModule from './native-modules/SystemVolumeModule';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AlarmSuccess() {
  const successOpacity = useRef(new Animated.Value(0)).current;
  const storyViewRef = useRef<View>(null);
  const [showStoryView, setShowStoryView] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Get current time for wake-up display
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  useEffect(() => {
    // Restore volume when success screen loads
    const restoreVolume = async () => {
      if (Platform.OS === 'ios') {
        try {
          await SystemVolumeModule.restoreOriginalVolume();
          console.log('🔊 Volume restored in alarm-success');
        } catch (error) {
          console.log('Volume restore failed:', error);
        }
      }
    };
    
    restoreVolume();
    
    // Fade in animation
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
    
    // DON'T auto-navigate - let user choose to share or skip
    // const timer = setTimeout(() => {
    //   router.replace('/(tabs)');
    // }, 4000);
    
    // return () => clearTimeout(timer);
  }, []);

  const shareToInstagram = async () => {
    try {
      console.log('🎯 Share to Instagram clicked!');
      
      // Show the story view
      console.log('📱 Showing story view...');
      setShowStoryView(true);
      
      // Wait for it to render properly
      console.log('⏱️ Waiting for story view to render...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds so we can see it
      
      if (!storyViewRef.current) {
        console.log('❌ Story view ref is null');
        Alert.alert('Error', 'Unable to create achievement image. Please try again.');
        return;
      }

      console.log('✅ Story view ref exists, ready to capture');

      // Capture the image
      console.log('📸 Capturing image...');
      // Fix the capture settings to match screen size:
      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        // Remove fixed height/width - let it capture the actual screen size
      });

      console.log('🖼️ Image captured successfully:', uri);

      // Share to Instagram using stickerImage (the correct way)
      const shareOptions = {
        stickerImage: uri,  // Use stickerImage instead of url
        social: Share.Social.INSTAGRAM_STORIES as any,
        appId: '1104244401532187',
        backgroundBottomColor: '#1a1a2e',
        backgroundTopColor: '#1a1a2e',
      };
      
      await Share.shareSingle(shareOptions);
      console.log('✅ Successfully shared to Instagram!');
      
      // Only hide after sharing
      setShowStoryView(false);
      router.replace('/(tabs)');
      
    } catch (error: any) {
      console.error('💥 Error sharing to Instagram:', error);
      setShowStoryView(false);
      Alert.alert('Sharing Error', 'Unable to share your achievement. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'slide_from_bottom'
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
          <Text style={styles.subtitle}>You're awake! 🎉</Text>
          
          <TouchableOpacity style={styles.shareButton} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share" size={24} color="#fff" />
            <Text style={styles.shareText}>Share Achievement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        wakeUpTime={currentTime}
        onShareToJournal={() => {
          setShowShareModal(false);
          // Automatically go to journal instead of showing button
          router.push(`/journal/add?time=${currentTime}`);
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
}); 