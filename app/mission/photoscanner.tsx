//it should be just camera that takes a photo

import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhotoScanner() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
  };

  const savePhotoToStorage = async (photoPath: string) => {
    try {
      const existingPhotosString = await AsyncStorage.getItem('savedPhotos');
      let existingPhotos: string[] = [];
      
      if (existingPhotosString) {
        existingPhotos = JSON.parse(existingPhotosString);
      }

      const updatedPhotos = [...existingPhotos, photoPath];
      await AsyncStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos));
      console.log('Photo saved:', photoPath);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  };

  const capturePhoto = async () => {
    try {
      if (camera.current) {
        const photo = await camera.current.takePhoto({
          flash: 'off'
        });
        
        await savePhotoToStorage(photo.path);
        router.replace({
          pathname: '/mission/photo',
          params: {
            capturedPhoto: photo.path
          }
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  if (!hasPermission || !device) return null;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
          <View style={styles.buttonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
}); 