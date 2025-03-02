import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Animated } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'react-native-vision-camera';
import { useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { stopAlarmSound } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FinalQRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const device = useCameraDevice('back');
  const [hasScanned, setHasScanned] = useState(false);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [targetQRCode, setTargetQRCode] = useState<string | null>(null);
  const [wrongQRCode, setWrongQRCode] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      try {
        const cameraPermission = await Camera.requestCameraPermission();
        setHasPermission(cameraPermission === 'granted');
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        setHasPermission(false);
      }
    };

    getBarCodeScannerPermissions();
    startScanAnimation();

    // Start timer for mission
    const timer = setTimeout(() => {
      if (!hasScanned) {
        setTimeExpired(true);
        handleMissionFailed('Time expired');
      }
    }, 20000);

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const loadTargetQRCode = async () => {
      try {
        console.log('Loading QR code from alarm settings with ID:', params.alarmId);
        
        if (params.alarmId) {
          const alarmsJson = await AsyncStorage.getItem('alarms');
          console.log('Retrieved alarms JSON:', alarmsJson ? 'Found' : 'Not found');
          
          if (alarmsJson) {
            const alarms = JSON.parse(alarmsJson);
            console.log('Number of alarms found:', alarms.length);
            
            const alarm = alarms.find((a: any) => a.id === params.alarmId);
            console.log('Found alarm:', alarm ? 'Yes' : 'No');
            
            if (alarm) {
              console.log('Alarm mission:', JSON.stringify(alarm.mission));
              
              if (alarm.mission && alarm.mission.settings) {
                console.log('Mission settings:', JSON.stringify(alarm.mission.settings));
                
                // Check for targetCode in settings
                if (alarm.mission.settings.targetCode) {
                  const code = alarm.mission.settings.targetCode;
                  console.log('Found target QR code in settings:', code);
                  setTargetQRCode(code);
                } else {
                  console.log('No targetCode in mission settings');
                }
              } else {
                console.log('No mission or settings in alarm');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading target QR code:', error);
      }
    };
    
    loadTargetQRCode();
  }, [params.alarmId]);

  const startScanAnimation = () => {
    scanLineAnimation.setValue(0);
    animationRef.current = Animated.loop(
      Animated.timing(scanLineAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    );
    animationRef.current.start();
  };

  const handleSuccess = async () => {
    try {
      // Stop the alarm sound
      await stopAlarmSound();
      
      // Navigate to success screen
      router.replace({
        pathname: '/',
        params: {
          missionComplete: 'true',
          alarmId: params.alarmId
        }
      });
    } catch (error) {
      console.error('Error handling success:', error);
      // Still navigate even if there's an error
      router.replace('/');
    }
  };

  const handleFailure = () => {
    // Navigate back to alarm screen
    router.back();
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !hasScanned && codes[0].value) {
        const data = codes[0].value;
        handleBarCodeScanned({ type: codes[0].type || 'unknown', data });
      }
    }
  });

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (hasScanned) return;
    
    setHasScanned(true);
    console.log(`Bar code with type ${type} and data ${data} has been scanned!`);
    
    // If we have a target QR code, validate against it
    if (targetQRCode && targetQRCode.trim() !== '') {
      console.log('Comparing scanned code:', data);
      console.log('With target code:', targetQRCode);
      
      // Trim both strings and compare
      const normalizedScanned = data.trim();
      const normalizedTarget = targetQRCode.trim();
      
      if (normalizedScanned === normalizedTarget) {
        console.log('QR code match! Mission successful');
        setShowCompletion(true);
        
        // Navigate to success screen after delay
        setTimeout(() => {
          handleSuccess();
        }, 2000);
      } else {
        console.log('QR code does not match target. Mission failed');
        console.log(`Scanned (${normalizedScanned.length}): "${normalizedScanned}"`);
        console.log(`Target (${normalizedTarget.length}): "${normalizedTarget}"`);
        
        // Show wrong QR code message instead of time expired
        setShowFailure(true);
        
        // Navigate back to alarm screen after delay
        setTimeout(() => {
          handleMissionFailed('Wrong QR code');
        }, 2000);
      }
    } else {
      // If no target code is set, accept any QR code
      console.log('No target QR code set, accepting any code');
      setShowCompletion(true);
      
      // Navigate to success screen after delay
      setTimeout(() => {
        handleSuccess();
      }, 2000);
    }
  };

  const handleMissionFailed = (reason: string) => {
    console.log('Mission failed:', reason);
    
    // Navigate back to alarm-ring after a delay
    router.replace({
      pathname: '/alarm-ring',
      params: { alarmId: params.alarmId }
    });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => router.back()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera not available</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => router.back()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade'
        }} 
      />
      <SafeAreaView style={styles.container}>
        {showCompletion ? (
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>WELL DONE!</Text>
            <Text style={styles.completionSubText}>Alarm Dismissed</Text>
          </View>
        ) : showFailure ? (
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>Wrong QR Code!</Text>
            <Text style={styles.completionSubText}>Try Again</Text>
          </View>
        ) : timeExpired ? (
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>Time's Up!</Text>
            <Text style={styles.completionSubText}>Try Again</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Scan any QR code</Text>
              <Text style={styles.subtitle}>
                Scan any QR code to dismiss the alarm
              </Text>
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
                  Place a QR/Barcode inside the rectangle
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleFailure}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#0B84FE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
}); 