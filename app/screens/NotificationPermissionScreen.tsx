import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationPermissionScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  
  // Check current permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);
  
  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };
  
  const requestPermission = async () => {
    try {
      // If already denied, open settings
      if (permissionStatus === 'denied') {
        openSettings();
        return;
      }
      
      // Otherwise request permission
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        await AsyncStorage.setItem('notificationPermissionGranted', 'true');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      router.replace('/(tabs)');
    }
  };
  
  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image 
            source={require('../../assets/images/notification-icon.png')} 
            style={styles.image}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>Enable Notifications</Text>
          
          <Text style={styles.description}>
            Bliss Alarm Clock requires notifications to wake you up at your scheduled times.
            Without this permission, your alarms won't work properly.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>
              {permissionStatus === 'denied' ? 'Open Settings' : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            ⚠️ Alarms will not function without notification permissions
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  }
}); 