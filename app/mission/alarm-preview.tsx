import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';

const SOUND_FILES = {
  'Orkney': require('../../assets/sounds/orkney.caf'),
  'Radar': require('../../assets/sounds/radar.caf'),
  'Beacon': require('../../assets/sounds/beacon.caf'),
  'Chimes': require('../../assets/sounds/chimes.caf'),
  'Circuit': require('../../assets/sounds/circuit.caf'),
  'Reflection': require('../../assets/sounds/reflection.caf')
} as const;

export default function AlarmPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Get sound name and volume from params, default to 'Beacon' and 1
  const soundName = (params.sound as keyof typeof SOUND_FILES) || 'Beacon';
  const soundVolume = Number(params.soundVolume) || 1;

  useEffect(() => {
    loadSound();
    return () => {
      if (sound) {
        sound.stopAsync().then(() => {
          sound.unloadAsync();
        }).catch(error => {
          console.log('Error cleaning up sound:', error);
        });
      }
    };
  }, []);

  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        SOUND_FILES[soundName],
        { 
          isLooping: true,
          volume: soundVolume,
          shouldPlay: true
        }
      );
      setSound(sound);
    } catch (error) {
      console.error('Error loading sound', error);
    }
  };

  const handleStartMission = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.push({
      pathname: '/mission/mathpreview',
      params: params
    });
  };

  const handleExitPreview = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.back();
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
          <Text style={styles.startButtonText}>Start Mission</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exitButton}
          onPress={handleExitPreview}
        >
          <Text style={styles.exitButtonText}>EXIT PREVIEW</Text>
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
  exitButton: {
    padding: 15,
    borderRadius: 15,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
}); 