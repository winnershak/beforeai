import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define sounds with their require statements
const alarmSounds = [
  { 
    id: '1', 
    name: 'Orkney',
    soundFile: require('../assets/sounds/orkney.caf')
  },
  { 
    id: '2', 
    name: 'Radar',
    soundFile: require('../assets/sounds/radar.caf')
  },
  { 
    id: '3', 
    name: 'Beacon',
    soundFile: require('../assets/sounds/beacon.caf')
  },
  { 
    id: '4', 
    name: 'Chimes',
    soundFile: require('../assets/sounds/chimes.caf')
  },
  { 
    id: '5', 
    name: 'Circuit',
    soundFile: require('../assets/sounds/circuit.caf')
  },
  { 
    id: '6', 
    name: 'Reflection',
    soundFile: require('../assets/sounds/reflection.caf')
  },
];

export default function SoundsScreen() {
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Set up audio
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  async function playSound(soundFile: any, soundId: string) {
    try {
      // Stop any currently playing sound
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }

      console.log('Loading sound...');
      const { sound: newSound } = await Audio.Sound.createAsync(
        soundFile,
        {
          shouldPlay: true,
          volume: 0.5,
        }
      );
      
      console.log('Playing sound...');
      setSound(newSound);
      setPlayingId(soundId);

      // Stop after 3 seconds
      setTimeout(async () => {
        if (newSound) {
          await newSound.stopAsync();
          setPlayingId(null);
        }
      }, 3000);

    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Unable to play sound. Please try again.');
    }
  }

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {alarmSounds.map((alarmSound) => (
          <TouchableOpacity
            key={alarmSound.id}
            style={styles.soundItem}
            onPress={() => {
              if (playingId === alarmSound.id) {
                // Stop playing
                if (sound) {
                  sound.stopAsync();
                  setPlayingId(null);
                }
              } else {
                // Play sound
                playSound(alarmSound.soundFile, alarmSound.id);
              }
            }}
          >
            <View style={styles.soundInfo}>
              <Text style={styles.soundName}>{alarmSound.name}</Text>
              <Text style={styles.soundDescription}>Tap to preview</Text>
            </View>
            <View style={styles.soundControls}>
              <Ionicons 
                name={playingId === alarmSound.id ? "pause-circle" : "play-circle"} 
                size={24} 
                color="#00BCD4" 
              />
              <TouchableOpacity
                onPress={async () => {
                  const selectedSound = alarmSound.name;
                  
                  // Save to both temp state and main alarm state
                  const savedState = await AsyncStorage.getItem('tempAlarmState');
                  const state = savedState ? JSON.parse(savedState) : {};
                  state.sound = selectedSound;
                  await AsyncStorage.setItem('tempAlarmState', JSON.stringify(state));
                  
                  // Save to alarms if editing
                  const existingAlarms = await AsyncStorage.getItem('alarms');
                  if (existingAlarms) {
                    const alarms = JSON.parse(existingAlarms);
                    const updatedAlarms = alarms.map((alarm: any) => {
                      if (alarm.id === state.id) {
                        return { ...alarm, sound: selectedSound };
                      }
                      return alarm;
                    });
                    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
                  }
                  
                  // Navigate back with params
                  router.back();
                  router.setParams({ selectedSound });
                }}
              >
                <Text style={styles.selectButton}>Select</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  content: {
    flex: 1,
  },
  soundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  soundDescription: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  soundControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  selectButton: {
    color: '#00BCD4',
    fontSize: 17,
    fontWeight: '600',
  },
}); 