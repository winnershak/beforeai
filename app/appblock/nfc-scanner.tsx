import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Platform, Vibration, NativeModules } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';

export default function NFCScanner() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initNFC();
    return () => {
      cleanUp();
    };
  }, []);

  const cleanUp = async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
      await NfcManager.unregisterTagEvent();
    } catch (error) {
      console.log('NFC cleanup error:', error);
    }
  };

  const initNFC = async () => {
    try {
      console.log('🔍 Checking NFC support...');
      const isSupported = await NfcManager.isSupported();
      console.log('📱 NFC isSupported result:', isSupported);
      
      if (!isSupported) {
        console.log('⚠️ NFC not supported, but trying anyway...');
        // Don't return here - let's try anyway for debugging
      }

      console.log('🚀 Starting NFC Manager...');
      await NfcManager.start();
      console.log('✅ NFC Manager started successfully');
      
      // Start scanning immediately
      startNFCScanning();
    } catch (error) {
      console.error('💥 Error initializing NFC:', error);
      Alert.alert('NFC Error', 'Failed to initialize NFC. Please try again.');
    }
  };

  const startNFCScanning = async () => {
    try {
      setIsScanning(true);
      
      // iOS will show native NFC dialog
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Hold your Bliss Alarm NFC card near the phone to end blocking'
      });
      
      const tag = await NfcManager.getTag();
      
      if (tag) {
        // Read NDEF message
        if (tag.ndefMessage && tag.ndefMessage.length > 0) {
          const ndefRecord = tag.ndefMessage[0];
          const payload = ndefRecord.payload;
          
          // Convert payload to string
          let text = '';
          if (payload && payload.length > 0) {
            // Skip the language code bytes (usually first 3 bytes for Text records)
            const textBytes = payload.slice(3);
            text = String.fromCharCode(...textBytes);
          }
          
          console.log('NFC card data:', text);
          
          // Check if this is a valid Bliss Alarm card
          if (text.toUpperCase().includes("BLISS-ALARM-2025-01")) {
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            
            await NfcManager.cancelTechnologyRequest();
            handleEndBlocking();
          } else {
            await NfcManager.cancelTechnologyRequest();
            
            Alert.alert(
              'Invalid Card',
              'This is not a valid Bliss Alarm NFC card.',
              [
                { 
                  text: 'Try Again', 
                  onPress: () => startNFCScanning()
                },
                { text: 'Cancel', onPress: () => router.back() }
              ]
            );
          }
        } else {
          // No NDEF message - could be an unformatted card
          await NfcManager.cancelTechnologyRequest();
          
          Alert.alert(
            'Invalid Card',
            'This NFC card does not contain valid Bliss Alarm data.',
            [
              { 
                text: 'Try Again', 
                onPress: () => startNFCScanning()
              },
              { text: 'Cancel', onPress: () => router.back() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error scanning NFC:', error);
      setIsScanning(false);
      
      // User cancelled or error occurred
      if (error === 'cancelled') {
        router.back();
      } else {
        Alert.alert(
          'NFC Error', 
          'Failed to scan NFC card. Please try again.',
          [
            { text: 'Try Again', onPress: () => startNFCScanning() },
            { text: 'Cancel', onPress: () => router.back() }
          ]
        );
      }
    }
  };

  const handleEndBlocking = async () => {
    try {
      console.log('🔓 Ending blocking via NFC scan...');
      
      // Update schedules to inactive
      const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
      if (savedSchedules) {
        const schedules = JSON.parse(savedSchedules);
        const inactiveSchedules = schedules.map((s: any) => ({
          ...s,
          isActive: false
        }));
        await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(inactiveSchedules));
      }
      
      // Remove shields from native module
      if (Platform.OS === 'ios') {
        const { ScreenTimeBridge } = NativeModules;
        if (ScreenTimeBridge) {
          await ScreenTimeBridge.removeAllShields();
          console.log('🛡️ All shields removed');
        }
      }
      
      router.back();
    } catch (error) {
      console.error('💥 Error ending blocking:', error);
      Alert.alert('Error', 'Failed to end blocking. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Scan NFC Card',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Scanning for NFC Card...</Text>
        <Text style={styles.subtitle}>
          The system NFC dialog should appear. Hold your Bliss Alarm card near the top of your device.
        </Text>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  cancelButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  cancelButtonText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 