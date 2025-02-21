import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Add these at the top level of the file, outside the component
const SOUNDS = {
  beacon: require('../../assets/sounds/beacon.caf'),
  chimes: require('../../assets/sounds/chimes.caf'),
  circuit: require('../../assets/sounds/circuit.caf')
};

export default function TypingAlarmPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    loadAndPlaySound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadAndPlaySound = async () => {
    try {
      const soundName = params.sound as keyof typeof SOUNDS || 'beacon';
      const soundFile = SOUNDS[soundName];

      const { sound: alarmSound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          isLooping: true,
          volume: Number(params.volume) || 1
        }
      );
      setSound(alarmSound);
      await alarmSound.playAsync();
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const handleStartMission = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.push({
      pathname: '/mission/typingpreview',
      params: {
        ...params,
        phrase: params.phrase,
        missionType: 'typing'
      }
    });
  };

  const handleClose = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.timeText}>
          {params.time}
        </Text>

        <View style={styles.missionInfo}>
          <Text style={styles.missionTitle}>Typing Mission</Text>
          <Text style={styles.missionDescription}>
            Type the phrase correctly to dismiss
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartMission}
        >
          <Text style={styles.startButtonText}>Start Mission</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeText: {
    fontSize: 60,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  missionInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  missionTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  missionDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 