import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define sounds with categories
const alarmSounds = [
  // Original sounds (Default category)
  { 
    id: 'orkney', 
    name: 'Orkney',
    soundFile: require('../assets/sounds/orkney.caf'),
    category: 'default'
  },
  { 
    id: 'radar', 
    name: 'Radar',
    soundFile: require('../assets/sounds/radar.caf'),
    category: 'default'
  },
  { 
    id: 'beacon', 
    name: 'Beacon',
    soundFile: require('../assets/sounds/beacon.caf'),
    category: 'default'
  },
  { 
    id: 'chimes', 
    name: 'Chimes',
    soundFile: require('../assets/sounds/chimes.caf'),
    category: 'default'
  },
  { 
    id: 'circuit', 
    name: 'Circuit',
    soundFile: require('../assets/sounds/circuit.caf'),
    category: 'default'
  },
  { 
    id: 'reflection', 
    name: 'Reflection',
    soundFile: require('../assets/sounds/reflection.caf'),
    category: 'default'
  },
  
  // Motivation sounds
  { 
    id: 'another-life', 
    name: 'Another Life',
    soundFile: require('../assets/sounds/wallpaper/another-life.caf'),
    category: 'motivation'
  },
  { 
    id: 'better', 
    name: 'Better',
    soundFile: require('../assets/sounds/wallpaper/better.caf'),
    category: 'motivation'
  },
  { 
    id: 'comfort', 
    name: 'Comfort',
    soundFile: require('../assets/sounds/wallpaper/comfort.caf'),
    category: 'motivation'
  },
  { 
    id: 'consistency', 
    name: 'Consistency',
    soundFile: require('../assets/sounds/wallpaper/consistency.caf'),
    category: 'motivation'
  },
  { 
    id: 'do-it-now', 
    name: 'Do It Now',
    soundFile: require('../assets/sounds/wallpaper/do-it-now.caf'),
    category: 'motivation'
  },
  { 
    id: 'dream', 
    name: 'Dream',
    soundFile: require('../assets/sounds/wallpaper/dream.caf'),
    category: 'motivation'
  },
  { 
    id: 'good-morning', 
    name: 'Good Morning',
    soundFile: require('../assets/sounds/wallpaper/good-morning.caf'),
    category: 'motivation'
  },
  { 
    id: 'justdoit', 
    name: 'Just Do It',
    soundFile: require('../assets/sounds/wallpaper/justdoit.caf'),
    category: 'motivation'
  },
  { 
    id: 'kobe', 
    name: 'Kobe',
    soundFile: require('../assets/sounds/wallpaper/kobe.caf'),
    category: 'motivation'
  },
  { 
    id: 'lazypeople', 
    name: 'Lazy People',
    soundFile: require('../assets/sounds/wallpaper/lazypeople.caf'),
    category: 'motivation'
  },
  { 
    id: 'lock-in', 
    name: 'Lock In',
    soundFile: require('../assets/sounds/wallpaper/lock-in.caf'),
    category: 'motivation'
  },
  { 
    id: 'mission', 
    name: 'Mission',
    soundFile: require('../assets/sounds/wallpaper/mission.caf'),
    category: 'motivation'
  },
  { 
    id: 'onemore', 
    name: 'One More',
    soundFile: require('../assets/sounds/wallpaper/onemore.caf'),
    category: 'motivation'
  },
  { 
    id: 'try-again', 
    name: 'Try Again',
    soundFile: require('../assets/sounds/wallpaper/try-again.caf'),
    category: 'motivation'
  },
  { 
    id: 'wake-up', 
    name: 'Wake Up',
    soundFile: require('../assets/sounds/wallpaper/wake-up.caf'),
    category: 'motivation'
  },
  { 
    id: 'woman', 
    name: 'Woman',
    soundFile: require('../assets/sounds/wallpaper/woman.caf'),
    category: 'motivation'
  },
  
  // Funny sounds
  { 
    id: 'cat-morning', 
    name: 'Cat Morning',
    soundFile: require('../assets/sounds/wallpaper/funny/cat-morning.caf'),
    category: 'funny'
  },
  { 
    id: 'cat', 
    name: 'Cat',
    soundFile: require('../assets/sounds/wallpaper/funny/cat.caf'),
    category: 'funny'
  },
  { 
    id: 'elmo', 
    name: 'Elmo',
    soundFile: require('../assets/sounds/wallpaper/funny/elmo.caf'),
    category: 'funny'
  },
  { 
    id: 'lewis', 
    name: 'Lewis',
    soundFile: require('../assets/sounds/wallpaper/funny/lewis.caf'),
    category: 'funny'
  },
  { 
    id: 'party', 
    name: 'Party',
    soundFile: require('../assets/sounds/wallpaper/funny/party.caf'),
    category: 'funny'
  },
  { 
    id: 'scary', 
    name: 'Scary',
    soundFile: require('../assets/sounds/wallpaper/funny/scary.caf'),
    category: 'funny'
  },
  { 
    id: 'wakey', 
    name: 'Wakey',
    soundFile: require('../assets/sounds/wallpaper/funny/wakey.caf'),
    category: 'funny'
  },
  { 
    id: 'wind', 
    name: 'Wind',
    soundFile: require('../assets/sounds/wallpaper/funny/wind.caf'),
    category: 'funny'
  },
  { 
    id: 'loveisland', 
    name: 'Love Island',
    soundFile: require('../assets/sounds/wallpaper/funny/loveisland.caf'),
    category: 'funny'
  },
  { 
    id: 'nokia', 
    name: 'Nokia',
    soundFile: require('../assets/sounds/wallpaper/funny/nokia.caf'),
    category: 'funny'
  },
];

export default function SoundsScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('default'); // Start with default

  // Filter sounds based on selected category
  const filteredSounds = alarmSounds.filter(s => s.category === selectedCategory);

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

      // Listen for when sound finishes naturally
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });

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
      {/* Category tabs - copied from wallpaper-selector */}
      <View style={styles.categoryButtons}>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'default' && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory('default')}
        >
          <Text style={[styles.categoryButtonText, selectedCategory === 'default' && styles.categoryButtonTextActive]}>Default</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'motivation' && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory('motivation')}
        >
          <Text style={[styles.categoryButtonText, selectedCategory === 'motivation' && styles.categoryButtonTextActive]}>Motivation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'funny' && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory('funny')}
        >
          <Text style={[styles.categoryButtonText, selectedCategory === 'funny' && styles.categoryButtonTextActive]}>Funny</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {filteredSounds.map((alarmSound) => (
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
                  const selectedSound = alarmSound.id;
                  
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
  // Add category button styles from wallpaper-selector
  categoryButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
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