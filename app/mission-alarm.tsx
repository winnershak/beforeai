import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

interface AlarmRingProps {
  id?: string;
  label?: string;
  mission?: {
    id: string;
    name: string;
    icon: string;
  } | null;
}

// Define sounds mapping
const alarmSounds = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

// Keep track of active sound globally
let activeSound: Audio.Sound | null = null;
let isAlarmActive = false;
let notificationHandled = false;

export default function MissionAlarmScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedSound = (params.sound as string) || 'Orkney';
  const alarmId = params.alarmId as string;
  const missionType = params.mission as string;

  useEffect(() => {
    console.log('MissionAlarmScreen mounted with params:', params);
    console.log('Mission type:', missionType);
  }, []);

  useEffect(() => {
    async function setupAudio() {
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

        console.log('Starting sound:', selectedSound);
        const { sound } = await Audio.Sound.createAsync(
          alarmSounds[selectedSound as keyof typeof alarmSounds],
          {
            shouldPlay: true,
            isLooping: true,
            volume: Number(params.soundVolume) || 1,
          }
        );
        
        activeSound = sound;
        await sound.playAsync();
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    }

    setupAudio();

    return () => {
      // Don't cleanup sound on unmount
      // Let it be handled by stop button
    };
  }, [selectedSound]);

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {new Date().toLocaleTimeString()}
      </Text>

      <TouchableOpacity 
        style={[styles.button, styles.missionButton]}
        onPress={() => {
          console.log('Starting mission:', missionType);
          if (activeSound) {
            activeSound.stopAsync();
            activeSound.unloadAsync();
          }
          router.push({
            pathname: `/mission/${missionType.toLowerCase()}`,
            params: { returnTo: pathname }
          });
        }}
      >
        <Text style={styles.buttonText}>
          Start {missionType} Mission
        </Text>
      </TouchableOpacity>
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
    backgroundColor: '#FF3B30',
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