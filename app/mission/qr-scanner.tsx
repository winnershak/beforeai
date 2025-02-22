import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const device = useCameraDevice('back');
  const [isMission] = useState(params.isMission === 'true');
  const targetCode = params.targetCode as string;
  const [hasScanned, setHasScanned] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);

  const TIMER_DURATION = 20000;

  useEffect(() => {
    const getPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
    };
    getPermission();
  }, []);

  useEffect(() => {
    if (isMission && !hasScanned && !timeExpired) {
      startTimer();
    }
    return () => cleanupTimer();
  }, [isMission, hasScanned, timeExpired]);

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
      }
    });
  };

  const cleanupTimer = () => {
    if (timerRef.current) {
      timerRef.current.stop();
      timerAnimation.setValue(0);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !hasScanned && !timeExpired) {
        setHasScanned(true);
        if (isMission) {
          if (codes[0].value === targetCode) {
            router.replace({
              pathname: '/mission/qrpreview',
              params: {
                ...params,
                success: 'true'
              }
            });
          } else {
            router.replace({
              pathname: '/mission/qrpreview',
              params: {
                ...params,
                sound: params.sound
              }
            });
          }
        } else {
          router.push({
            pathname: '/mission/qrcode',
            params: {
              ...params,
              scannedCode: codes[0].value
            }
          });
        }
      }
    }
  });

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {timeExpired ? (
        <View style={styles.timeUpContainer}>
          <Text style={styles.timeUpText}>Time's Up!</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setTimeExpired(false);
              setHasScanned(false);
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan Code</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.scannerContainer}>
            {isMission && (
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
            )}
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
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

          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.exitButton}
              onPress={() => router.back()}
            >
              <Text style={styles.exitButtonText}>Exit Preview</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 17,
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
  timeUpContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  timeUpText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 30,
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
  bottomContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  exitButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 
 