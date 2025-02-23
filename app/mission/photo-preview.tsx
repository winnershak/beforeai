// camera taking a photo with transparent photo to check the is it similar to the target photo

import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Animated } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImgToBase64 from 'react-native-image-base64';

export default function PhotoPreview() {
  const params = useLocalSearchParams();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);
  const targetPhoto = params.targetPhoto as string;
  const TIMER_DURATION = 20000; // 20 seconds

  useEffect(() => {
    checkPermission();
    startTimer();
    return () => cleanupTimer();
  }, []);

  const checkPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
  };

  const startTimer = () => {
    timerAnimation.setValue(0);
    timerRef.current = Animated.timing(timerAnimation, {
      toValue: 1,
      duration: TIMER_DURATION,
      useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) {
        handleTimeExpired();
      }
    });
  };

  const cleanupTimer = () => {
    if (timerRef.current) {
      timerRef.current.stop();
    }
  };

  const handleTimeExpired = async () => {
    setTimeExpired(true);
    setTimeout(() => {
      router.back();
    }, 1500);
  };

  const comparePhotos = async (newPhotoPath: string) => {
    try {
      if (!targetPhoto) return true;

      // For now, return true 30% of the time to test
      return Math.random() > 0.7;

      // TODO: Implement better comparison when native modules are properly set up
      
    } catch (error) {
      console.error('Error comparing photos:', error);
      return false;
    }
  };

  const capturePhoto = async () => {
    try {
      if (camera.current) {
        const photo = await camera.current.takePhoto({
          flash: 'off'
        });
        
        const isMatch = await comparePhotos(photo.path);
        
        if (isMatch) {
          cleanupTimer();
          setShowCompletion(true);
          setTimeout(() => {
            router.push({
              pathname: '/mission/photopreview',
              params: { success: 'true' }
            });
          }, 2000);
        } else {
          setTimeout(() => {
            router.back();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  if (!hasPermission || !device) return null;

  return (
    <View style={styles.container}>
      {showCompletion ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>WELL DONE!</Text>
          <Text style={styles.completionSubText}>Mission Complete</Text>
        </View>
      ) : timeExpired ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>Time's Up!</Text>
        </View>
      ) : (
        <>
          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerLine,
                {
                  width: timerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%'],
                  }),
                }
              ]} 
            />
          </View>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          <Image 
            source={{ uri: targetPhoto }}
            style={styles.overlayImage}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
              <View style={styles.buttonInner} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlayImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  completionText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  completionSubText: {
    color: '#666',
    fontSize: 24,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
  },
  timerContainer: {
    height: 3,
    backgroundColor: '#333',
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  timerLine: {
    height: '100%',
    backgroundColor: '#ff3b30',
  },
}); 