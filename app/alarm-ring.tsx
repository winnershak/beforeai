import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stopAlarmSound } from './notifications';

// Make sure these paths exactly match your sound files
const SOUND_FILES = {
  'circuit.mp3': require('../assets/sounds/circuit.mp3'),
  'orkney.mp3': require('../assets/sounds/orkney.mp3'),
  'radar.mp3': require('../assets/sounds/radar.mp3'),
  'reflection.mp3': require('../assets/sounds/reflection.mp3'),
};

export default function AlarmRingScreen() {
  const [sound, setSound] = useState<Audio.Sound>();
  const params = useLocalSearchParams();
  const alarmSound = params.sound as string || 'circuit.mp3';

  async function playSound() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const soundFile = SOUND_FILES[alarmSound as keyof typeof SOUND_FILES] || SOUND_FILES['circuit.mp3'];
      const { sound: audioSound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      
      setSound(audioSound);
      await audioSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  const handleStop = async () => {
    try {
      await stopAlarmSound();
      router.back();
    } catch (error) {
      console.error('Error stopping alarm:', error);
      router.back();
    }
  };

  useEffect(() => {
    playSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

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