import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Platform,
  NativeModules
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'react-native-vision-camera';
import { useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { ScreenTimeBridge } = NativeModules;

export default function QRScannerScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const [hasScanned, setHasScanned] = useState(false);
  const [savedQRCode, setSavedQRCode] = useState<string | null>(null);
  const isNavigating = useRef(false);

  useEffect(() => {
    loadSavedQRCode();
  }, []);

  const loadSavedQRCode = async () => {
    try {
      const qrCode = await AsyncStorage.getItem('blockEndQRCode');
      setSavedQRCode(qrCode);
      if (!qrCode) {
        Alert.alert(
          'No Code Found',
          'Please set up your block-end code first.',
          [
            { text: 'Set Up Code', onPress: () => router.push('/appblock/qr-setup') },
            { text: 'Cancel', onPress: () => router.back() }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
    }
  };

  const handleEndBlocking = async () => {
    try {
      console.log('🔓 Ending blocking via QR scan...');
      
      // If on iOS, use ScreenTimeBridge to completely stop monitoring
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        // Remove all shields immediately
        await ScreenTimeBridge.removeAllShields();
        console.log('🛡️ All shields removed');
        
        // Stop monitoring for all schedules
        await ScreenTimeBridge.stopMonitoringForSchedule('main-schedule', 0);
        console.log('🔥 Stopped monitoring');
      }
      
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
      
      Alert.alert(
        'Blocking Ended!',
        'All apps and websites have been unblocked.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/appblock') }]
      );
      
    } catch (error) {
      console.error('💥 Error ending blocking:', error);
      Alert.alert('Error', 'Failed to end blocking. Please try again.');
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !hasScanned && !isNavigating.current && codes[0].value) {
        setHasScanned(true);
        isNavigating.current = true;
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        const scannedCode = codes[0].value.trim();
        console.log('Scanned code:', scannedCode);
        console.log('Expected code:', savedQRCode);
        
        if (savedQRCode && scannedCode === savedQRCode.trim()) {
          console.log('✅ QR code match! Ending blocking...');
          handleEndBlocking();
        } else {
          console.log('❌ Wrong QR code!');
          Alert.alert(
            'Wrong Code',
            'This is not your block-end code. Please scan the correct code.',
            [
              { 
                text: 'Try Again', 
                onPress: () => {
                  setHasScanned(false);
                  isNavigating.current = false;
                }
              },
              { text: 'Cancel', onPress: () => router.back() }
            ]
          );
        }
      }
    }
  });

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Camera not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Scan to End Blocking',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Scan Your Code</Text>
        <Text style={styles.subtitle}>Scan the code you saved to end blocking</Text>
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
  bottomContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  setupButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
}); 