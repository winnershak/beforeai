import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlarmTrigger() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleStartMission = () => {
    router.push({
      pathname: '/mission/mathmission',
      params: params
    });
  };

  const handleSnooze = async () => {
    try {
      const activeAlarm = await AsyncStorage.getItem('activeAlarm');
      if (activeAlarm) {
        const alarm = JSON.parse(activeAlarm);
        // Update snooze time
        alarm.snoozeTime = new Date(Date.now() + 300000); // 5 minutes
        await AsyncStorage.setItem('activeAlarm', JSON.stringify(alarm));
      }
      router.push('/');
    } catch (error) {
      console.error('Error handling snooze:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.timeText}>20:31</Text>
        <Text style={styles.dateText}>Wednesday, 19 February</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartMission}
        >
          <Text style={styles.startButtonText}>START MISSION</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.snoozeButton}
          onPress={handleSnooze}
        >
          <Text style={styles.snoozeButtonText}>SNOOZE (5 MIN)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 96,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#fff',
    fontSize: 24,
    marginTop: 10,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: '#ff3b30',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  snoozeButton: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 15,
  },
  snoozeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 