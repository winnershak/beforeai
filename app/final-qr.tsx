import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Animated, Platform, Vibration } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'react-native-vision-camera';
import { useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { stopAlarmSound } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function FinalQRScanner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const device = useCameraDevice('back');
  const [hasScanned, setHasScanned] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [targetQRCode, setTargetQRCode] = useState<string | null>(null);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);
  const isNavigating = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWrongQR, setShowWrongQR] = useState(false);

  const TIMER_DURATION = 20000;

  useEffect(() => {
    if (!hasScanned && !timeExpired) {
      startTimer();
    }
    return () => cleanupTimer();
  }, [hasScanned, timeExpired]);

  const startTimer = () => {
    cleanupTimer();
    timerAnimation.setValue(0);
    timerRef.current = Animated.timing(timerAnimation, {
      toValue: 1,
      duration: TIMER_DURATION,
      useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) {
        setTimeExpired(true);
        if (!isNavigating.current) {
          isNavigating.current = true;
          router.replace({
            pathname: '/alarm-ring',
            params: {
              alarmId: params.alarmId,
              missionFailed: 'true'
            }
          });
        }
      }
    });
  };

  const cleanupTimer = () => {
    if (timerRef.current) {
      timerRef.current.stop();
      timerAnimation.setValue(0);
    }
  };

  const handleExitScanner = () => {
    if (!isNavigating.current) {
      isNavigating.current = true;
      router.replace({
        pathname: '/alarm-ring',
        params: {
          alarmId: params.alarmId,
          missionFailed: 'true'
        }
      });
    }
  };

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
              
              // Check different possible locations for the target code
              let targetCode = null;
              
              if (alarm.mission && alarm.mission.settings && alarm.mission.settings.targetCode) {
                targetCode = alarm.mission.settings.targetCode;
                console.log('Found target QR code in mission settings:', targetCode);
              } else if (params.targetCode) {
                targetCode = params.targetCode;
                console.log('Found target QR code in params:', targetCode);
              }
              
              if (targetCode) {
                setTargetQRCode(targetCode);
              } else {
                console.log('No targetCode found in mission settings or params');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading target QR code:', error);
      }
    };
    
    loadTargetQRCode();
  }, [params.alarmId, params.targetCode]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !hasScanned && !timeExpired && !isNavigating.current && codes[0].value) {
        setHasScanned(true);
        isNavigating.current = true;
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Vibration.vibrate(200);
        }
        console.log('Scanned code:', codes[0].value);
        console.log('Target code:', targetQRCode);
        
        if (targetQRCode) {
          const scannedCode = codes[0].value.trim();
          const target = targetQRCode.trim();
          
          console.log('Comparing:', scannedCode, 'with', target);
          
          if (scannedCode === target) {
            console.log('✅ QR code match!');
            stopAlarmSound();
            // Skip the built-in success screen and go directly to Instagram success
            router.replace('/alarm-success');
          } else {
            console.log('❌ Wrong QR code!');
            console.log('Navigating to QR failure screen');
            router.navigate({
              pathname: '/mission/qr-failure',
              params: {
                alarmId: params.alarmId
              }
            });
          }
        } else {
          console.log('No target code set, accepting any code');
          stopAlarmSound();
          // Skip the built-in success screen and go directly to Instagram success
          router.replace('/alarm-success');
        }
      }
    }
  });

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera not available</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
  options={{
    headerShown: false,
    gestureEnabled: false,
    animation: 'none',         // for subtle transition (or use 'default' for horizontal slide)
    presentation: 'card'       // fixes the "modal slide-up" behavior
  }} 
/>
      <SafeAreaView style={styles.container}>
        {timeExpired ? (
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>Time's Up!</Text>
            <Text style={styles.completionSubText}>Try Again</Text>
            <TouchableOpacity 
              style={styles.exitButton}
              onPress={handleExitScanner}
            >
              <Text style={styles.exitButtonText}>Exit Scanner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Scan QR Code</Text>
            </View>

            <View style={styles.scannerContainer}>
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
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
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
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  completionText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#00ff00',
    marginBottom: 30,
  },
  completionSubText: {
    color: '#666',
    fontSize: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
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
  exitButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    width: '80%',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 
