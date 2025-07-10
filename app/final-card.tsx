import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Animated, Platform, Vibration } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stopAlarmSound } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export default function FinalCardScanner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasScanned, setHasScanned] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [scanning, setScanning] = useState(false);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);
  const isNavigating = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const TIMER_DURATION = 60000; // 60 seconds for NFC scanning

  // Bliss Alarm Card NFC identifier
  const BLISS_CARD_IDENTIFIER = "BLISS_ALARM_CARD";

  useEffect(() => {
    initNFC();
    if (!hasScanned && !timeExpired) {
      startTimer();
      startNFCScanning();
    }
    return () => {
      cleanupTimer();
      cleanupNFC();
    };
  }, [hasScanned, timeExpired]);

  const initNFC = async () => {
    try {
      const isSupported = await NfcManager.isSupported();
      if (isSupported) {
        await NfcManager.start();
        const isEnabled = await NfcManager.isEnabled();
        setNfcEnabled(isEnabled);
        console.log('NFC initialized, enabled:', isEnabled);
      } else {
        console.log('NFC not supported on this device');
        Alert.alert(
          'NFC Not Supported',
          'This device does not support NFC. Please use the backup dismissal method.',
          [{ text: 'OK', onPress: () => handleBackupDismissal() }]
        );
      }
    } catch (error) {
      console.error('Error initializing NFC:', error);
    }
  };

  const startNFCScanning = async () => {
    if (!nfcEnabled || scanning) return;
    
    try {
      setScanning(true);
      console.log('Starting NFC scan for Bliss Alarm Card...');
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      const tag = await NfcManager.getTag();
      console.log('NFC tag detected:', tag);
      
      if (tag) {
        await handleNFCTag(tag);
      }
    } catch (error) {
      console.error('NFC scanning error:', error);
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('NFC scan was cancelled');
      }
    } finally {
      setScanning(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        console.log('Error cancelling NFC request:', e);
      }
    }
  };

  const handleNFCTag = async (tag: any) => {
    if (hasScanned || timeExpired || isNavigating.current) return;
    
    try {
      console.log('Processing NFC tag:', tag);
      
      // Check if this is a Bliss Alarm Card
      const isBlissCard = checkIfBlissCard(tag);
      
      if (isBlissCard) {
        console.log('✅ Bliss Alarm Card detected!');
        setHasScanned(true);
        isNavigating.current = true;
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Vibration.vibrate(200);
        }
        
        stopAlarmSound();
        
        // FIXED: Disable the alarm instead of just removing activeAlarm
        await disableAlarm(params.alarmId as string);
        
        // Clear the active alarm
        await AsyncStorage.removeItem('activeAlarm');
        
        // Show success and navigate home
        setShowSuccess(true);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
        
      } else {
        console.log('❌ Not a Bliss Alarm Card!');
        Alert.alert(
          'Wrong Card',
          'Please tap your Bliss Alarm Card to turn off the alarm.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setTimeout(() => startNFCScanning(), 1000);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing NFC tag:', error);
    }
  };

  const checkIfBlissCard = (tag: any): boolean => {
    try {
      // Check tag ID or NDEF records for Bliss card identifier
      if (tag.id) {
        const tagId = Array.isArray(tag.id) ? 
          tag.id.map((byte: number) => byte.toString(16).padStart(2, '0')).join('') :
          tag.id.toString();
        
        console.log('Tag ID:', tagId);
        
        // Check if it's a known Bliss card ID (you would store these)
        // For now, we'll accept any NFC card as a Bliss card for testing
        return true;
      }
      
      // Check NDEF records
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (const record of tag.ndefMessage) {
          if (record.payload) {
            const payload = String.fromCharCode.apply(null, record.payload);
            console.log('NDEF payload:', payload);
            
            if (payload.includes(BLISS_CARD_IDENTIFIER)) {
              return true;
            }
          }
        }
      }
      
      // For demo purposes, accept any NFC card
      return true;
      
    } catch (error) {
      console.error('Error checking card:', error);
      return false;
    }
  };

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

  const cleanupNFC = async () => {
    try {
      setScanning(false);
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.log('Error cleaning up NFC:', error);
    }
  };

  const handleExitScanner = () => {
    if (!isNavigating.current) {
      isNavigating.current = true;
      router.replace({
        pathname: '/alarm-ring',
        params: {
          alarmId: params.alarmId,
        }
      });
    }
  };

  const handleBackupDismissal = () => {
    // Fallback method if NFC is not available
    Alert.alert(
      'Backup Dismissal',
      'Since NFC is not available, the alarm will be dismissed.',
      [
        {
          text: 'Dismiss Alarm',
          onPress: async () => {
            stopAlarmSound();
            await AsyncStorage.removeItem('activeAlarm');
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  const handleRetryNFC = () => {
    if (!scanning) {
      startNFCScanning();
    }
  };

  const disableAlarm = async (alarmId: string) => {
    try {
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        const alarms = JSON.parse(alarmsJson);
        const updatedAlarms = alarms.map((alarm: any) => {
          if (alarm.id === alarmId) {
            return { ...alarm, enabled: false };
          }
          return alarm;
        });
        await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
        console.log(`Alarm ${alarmId} disabled after successful mission`);
      }
    } catch (error) {
      console.error('Error disabling alarm:', error);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
          presentation: 'card'
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
              <Text style={styles.exitButtonText}>Back to Alarm</Text>
            </TouchableOpacity>
          </View>
        ) : showSuccess ? (
          <View style={styles.completionContainer}>
            <Text style={styles.successText}>MISSION COMPLETE!</Text>
            <Text style={styles.completionSubText}>Alarm Dismissed</Text>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Tap Bliss Alarm Card</Text>
              <Text style={styles.subtitle}>💳</Text>
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
              
              <View style={styles.nfcContainer}>
                <View style={styles.nfcIcon}>
                  <Ionicons 
                    name="wifi" 
                    size={100} 
                    color={scanning ? "#FF9500" : "#666"} 
                    style={{ transform: [{ rotate: '45deg' }] }}
                  />
                </View>
                
                <Text style={styles.instructionText}>
                  {scanning ? 'Ready to scan...' : 'Preparing NFC...'}
                </Text>
                
                <Text style={styles.subInstructionText}>
                  Hold your Bliss Alarm Card near the back of your phone
                </Text>
                
                {!nfcEnabled && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>NFC is not enabled</Text>
                    <TouchableOpacity 
                      style={styles.settingsButton}
                      onPress={() => handleBackupDismissal()}
                    >
                      <Text style={styles.settingsButtonText}>Use Backup Method</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {nfcEnabled && (
                  <TouchableOpacity 
                    style={styles.scanButton}
                    onPress={handleRetryNFC}
                  >
                    <Text style={styles.scanButtonText}>
                      {scanning ? 'Scan Again' : 'Start Scan'}
                    </Text>
                  </TouchableOpacity>
                )}
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
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 40,
    marginBottom: 10,
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
  nfcContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  nfcIcon: {
    marginBottom: 40,
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  subInstructionText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
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
    color: '#ff3b30',
    marginBottom: 30,
  },
  successText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 20,
  },
  completionSubText: {
    color: '#666',
    fontSize: 24,
    marginBottom: 20,
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
  errorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    marginBottom: 20,
  },
  settingsButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 30,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 