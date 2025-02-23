import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
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

// Static flag to prevent multiple instances
let isAlarmScreenActive = false;

export default function AlarmRingScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const params = useLocalSearchParams();
  const pathname = usePathname();
  
  useEffect(() => {
    if (isAlarmScreenActive) {
      console.log('Alarm screen already active, closing duplicate');
      router.back();
      return;
    }

    isAlarmScreenActive = true;
    console.log('Alarm screen activated');

    async function setupAudio() {
      try {
        // Get current alarm data
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) return;
        
        const alarms = JSON.parse(alarmsJson);
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const activeAlarm = alarms.find((alarm: any) => 
          alarm.enabled && alarm.time === currentTime
        );

        if (!activeAlarm) {
          console.log('No active alarm found for time:', currentTime);
          return;
        }

        console.log('Playing sound for alarm:', activeAlarm.sound);

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });

        const selectedSound = activeAlarm.sound || 'Orkney';
        const { sound: audioSound } = await Audio.Sound.createAsync(
          alarmSounds[selectedSound as keyof typeof alarmSounds],
          {
            shouldPlay: true,
            isLooping: true,
            volume: activeAlarm.soundVolume || 1,
          }
        );
        
        setSound(audioSound);
        await audioSound.playAsync();
        console.log('Started playing sound:', selectedSound);
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    }

    setupAudio();

    return () => {
      if (sound) {
        console.log('Cleaning up sound');
        sound.stopAsync().then(() => sound.unloadAsync());
      }
      isAlarmScreenActive = false;
      console.log('Alarm screen deactivated');
    };
  }, []);

  const handleStopAlarm = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    isAlarmScreenActive = false;
    router.back();
  };

  const handleStartMission = async () => {
    // Will implement mission logic later
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.push('/mission');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {new Date().toLocaleTimeString()}
      </Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleStopAlarm}
      >
        <Text style={styles.buttonText}>Stop Alarm</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.missionButton]}
        onPress={handleStartMission}
      >
        <Text style={styles.buttonText}>Start Mission</Text>
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
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 