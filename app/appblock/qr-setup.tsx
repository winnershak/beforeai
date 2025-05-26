import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Platform, Vibration } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'react-native-vision-camera';
import { useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function QRSetupScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const [hasScanned, setHasScanned] = useState(false);
  const isNavigating = useRef(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !hasScanned && !isNavigating.current && codes[0].value) {
        setHasScanned(true);
        isNavigating.current = true;
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Vibration.vibrate(200);
        }
        
        const scannedCode = codes[0].value.trim();
        console.log('Scanned QR code for blocking:', scannedCode);
        
        // Save the scanned QR code
        saveQRCode(scannedCode);
      }
    }
  });

  const saveQRCode = async (qrCode: string) => {
    try {
      await AsyncStorage.setItem('blockEndQRCode', qrCode);
      Alert.alert(
        'QR Code Saved!',
        'Your QR code has been saved. You can now use it to end blocking.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
      // Reset scanning state on error
      setHasScanned(false);
      isNavigating.current = false;
    }
  };

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Scan QR Code',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerShadowVisible: false,
          }}
        />
        <Text style={styles.errorText}>Camera not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Scan QR Code',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Scan Your QR Code</Text>
        <Text style={styles.subtitle}>Scan the QR code you want to use to end blocking</Text>
      </View>

      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={!hasScanned}
          codeScanner={codeScanner}
          enableZoomGesture
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
          </View>
          <Text style={styles.overlayText}>
            Place your QR code inside the rectangle
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: '80%',
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#0A84FF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
}); 