import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SnoozeConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [timeLeft, setTimeLeft] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (params.snoozeTime) {
        const snoozeTime = new Date(params.snoozeTime as string);
        const diff = snoozeTime.getTime() - now.getTime();
        
        if (diff <= 0) {
          // Time's up, go back to alarm ring
          clearInterval(timer);
          handleSnoozeComplete();
        } else {
          // Update countdown
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [params.snoozeTime]);

  const handleSnoozeComplete = async () => {
    // Get snoozed alarm data
    const snoozedAlarmJson = await AsyncStorage.getItem('snoozedAlarm');
    if (snoozedAlarmJson) {
      const snoozedAlarm = JSON.parse(snoozedAlarmJson);
      
      // Go back to alarm ring
      router.push({
        pathname: '/alarm-ring',
        params: {
          alarmId: snoozedAlarm.alarmId,
          hasMission: snoozedAlarm.hasMission,
          sound: snoozedAlarm.sound,
          soundVolume: snoozedAlarm.soundVolume
        }
      });
    } else {
      router.back();
    }
  };

  const handleStartMissionNow = async () => {
    const snoozedAlarmJson = await AsyncStorage.getItem('snoozedAlarm');
    if (snoozedAlarmJson) {
      const snoozedAlarm = JSON.parse(snoozedAlarmJson);
      
      router.push({
        pathname: '/alarm-ring',
        params: {
          alarmId: snoozedAlarm.alarmId,
          hasMission: snoozedAlarm.hasMission,
          sound: snoozedAlarm.sound,
          soundVolume: snoozedAlarm.soundVolume
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.time}>
          {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
        
        <Text style={styles.snoozeText}>
          Alarm snoozed for
        </Text>
        
        <Text style={styles.countdownText}>
          {timeLeft}
        </Text>
        
        {params.hasMission === 'true' && (
          <TouchableOpacity 
            style={styles.missionButton}
            onPress={handleStartMissionNow}
          >
            <Text style={styles.buttonText}>Start Mission Now</Text>
          </TouchableOpacity>
        )}
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
    padding: 20,
  },
  time: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  snoozeText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 10,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 40,
  },
  missionButton: {
    width: '80%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 