import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stopAlarmSound } from './notifications';

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();

  const handleStop = async () => {
    try {
      await stopAlarmSound();
      router.back();
    } catch (error) {
      console.error('Error stopping alarm:', error);
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.time}>
          {new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </Text>
        {params.label && (
          <Text style={styles.label}>{params.label}</Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.stopButton}
        onPress={handleStop}
      >
        <Ionicons name="stop-circle" size={64} color="#FF3B30" />
        <Text style={styles.stopText}>Stop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 100,
  },
  content: {
    alignItems: 'center',
  },
  time: {
    fontSize: 64,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 24,
    color: '#666',
  },
  stopButton: {
    alignItems: 'center',
  },
  stopText: {
    color: '#FF3B30',
    fontSize: 20,
    marginTop: 8,
  },
}); 