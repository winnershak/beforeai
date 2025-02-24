import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetAlarmState } from './notifications';

// Move these outside the component to be truly global
let isAlarmPageOpen = false;
let activeSound: Audio.Sound | null = null;
let isCleaningUp = false;  // Add this to prevent unwanted cleanup

// Define sounds mapping
const alarmSounds = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();
  const [selectedSound, setSelectedSound] = useState(params.sound as string || 'Orkney');
  const [hasMission, setHasMission] = useState(params.hasMission === 'true');

  useEffect(() => {
    const setupAlarm = async () => {
      // Prevent setup if cleaning up
      if (isCleaningUp) {
        console.log('Cleanup in progress, skipping setup');
        return;
      }

      // Check if router is ready
      if (!router.canGoBack()) {
        console.log('Router not ready, waiting...');
        return;
      }

      // Check if alarm is already playing
      if (isAlarmPageOpen && activeSound) {
        console.log('Alarm already active and playing');
        return;
      }

      isAlarmPageOpen = true;
      console.log('Setting up new alarm with sound:', selectedSound);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          alarmSounds[selectedSound as keyof typeof alarmSounds],
          {
            shouldPlay: true,
            isLooping: true,
            volume: Number(params.soundVolume) || 1,
          }
        );
        
        activeSound = sound;
        console.log('Starting alarm sound playback');
        await sound.playAsync();
      } catch (error) {
        console.error('Error setting up alarm sound:', error);
      }
    };

    setupAlarm();

    // Only cleanup when component is actually unmounting
    return () => {
      if (!isCleaningUp) {
        console.log('Component unmounting, cleaning up alarm');
        isCleaningUp = true;
        if (activeSound) {
          activeSound.stopAsync().then(() => {
            activeSound?.unloadAsync();
            activeSound = null;
            isAlarmPageOpen = false;
            isCleaningUp = false;
          });
        }
      }
    };
  }, []);

  const handleStopAlarm = async () => {
    console.log('Stop button pressed, cleaning up alarm');
    isCleaningUp = true;
    if (activeSound) {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
      activeSound = null;
    }
    isAlarmPageOpen = false;
    isCleaningUp = false;
    router.back();
  };

  const handleStartMission = async () => {
    if (activeSound) {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
      activeSound = null;
    }
    isAlarmPageOpen = false;
    router.back();
  };

  const startAlarmSound = async (sound: string, volume: number) => {
    try {
      if (activeSound) {
        console.log('Sound already playing, keeping existing sound');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: 1,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });

      console.log('Starting sound:', sound);
      const { sound: newSound } = await Audio.Sound.createAsync(
        alarmSounds[sound as keyof typeof alarmSounds],
        {
          shouldPlay: true,
          isLooping: true,
          volume: volume,
        }
      );
      
      activeSound = newSound;
      await newSound.playAsync();
    } catch (error) {
      console.error('Error starting alarm sound:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {new Date().toLocaleTimeString()}
      </Text>

      {hasMission ? (
        <TouchableOpacity 
          style={[styles.button, styles.missionButton]}
          onPress={handleStartMission}
        >
          <Text style={styles.buttonText}>
            Start Mission
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.stopButton]}
          onPress={handleStopAlarm}
        >
          <Text style={styles.buttonText}>Stop Alarm</Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  time: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  missionButton: {
    backgroundColor: '#00BCD4',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 