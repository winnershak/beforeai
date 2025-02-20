import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stopAlarmSound } from './notifications';

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();
  const [completed, setCompleted] = useState(false);

  const handleStop = async () => {
    await stopAlarmSound();
    setCompleted(true);
    
    // Show completion message briefly before returning
    setTimeout(() => {
      router.push('/(tabs)');
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {!completed ? (
        <>
          <Text style={styles.title}>Alarm!</Text>
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={handleStop}
          >
            <Ionicons name="stop-circle" size={64} color="#FF3B30" />
            <Text style={styles.stopText}>Stop Alarm</Text>
          </TouchableOpacity>
          
          {params.hasMission === 'true' && (
            <TouchableOpacity 
              style={styles.missionButton}
              onPress={() => {
                router.push({
                  pathname: '/mission/alarm-trigger',
                  params: {
                    id: params.id,
                    mission: params.mission,
                    sound: params.sound,
                    soundVolume: params.soundVolume
                  }
                });
              }}
            >
              <Text style={styles.missionText}>Complete Mission</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.completionContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.completionText}>Well Done!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 40,
  },
  stopButton: {
    alignItems: 'center',
  },
  stopText: {
    color: '#FF3B30',
    fontSize: 24,
    marginTop: 10,
  },
  missionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  missionText: {
    color: '#fff',
    fontSize: 18,
  },
  completionContainer: {
    alignItems: 'center',
  },
  completionText: {
    color: '#4CAF50',
    fontSize: 32,
    marginTop: 20,
  }
}); 