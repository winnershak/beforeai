import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';

// Preload sound assets with the correct path
const soundAssets: { [key: string]: any } = {
  'Beach': require('../../assets/sounds/beach.caf'),
  'Calm Rain': require('../../assets/sounds/calm-rain.caf'),
  'Fire': require('../../assets/sounds/fire.caf'),
  'Forest': require('../../assets/sounds/forest.caf'),
  'Piano': require('../../assets/sounds/piano.caf'),
  'White Noise': require('../../assets/sounds/white-noise.caf'),
  'Pink Noise': require('../../assets/sounds/pink-noise.caf'),
  'Rain': require('../../assets/sounds/rain.caf'),
  'Space': require('../../assets/sounds/space.caf'),
  'Thunder': require('../../assets/sounds/thunder.caf'),
  'Waterfall': require('../../assets/sounds/waterfall.caf'),
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

interface Sound {
  id: string;
  name: string;
  file: string;
  icon: string;
}

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 3; // 3 items per row with minimal padding

export default function SoundsScreen() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [timer, setTimer] = useState(60); // Default 60 minutes
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);

  // Define available sounds
  useEffect(() => {
    const availableSounds: Sound[] = [
      { id: '1', name: 'Beach', file: 'beach.caf', icon: 'sunny' },
      { id: '2', name: 'Calm Rain', file: 'calm-rain.caf', icon: 'rainy' },
      { id: '3', name: 'Fire', file: 'fire.caf', icon: 'flame' },
      { id: '4', name: 'Forest', file: 'forest.caf', icon: 'leaf' },
      { id: '5', name: 'Piano', file: 'piano.caf', icon: 'musical-notes' },
      { id: '6', name: 'White Noise', file: 'white-noise.caf', icon: 'radio' },
      { id: '7', name: 'Pink Noise', file: 'pink-noise.caf', icon: 'radio-outline' },
      { id: '8', name: 'Rain', file: 'rain.caf', icon: 'water' },
      { id: '9', name: 'Space', file: 'space.caf', icon: 'planet' },
      { id: '10', name: 'Thunder', file: 'thunder.caf', icon: 'thunderstorm' },
      { id: '11', name: 'Waterfall', file: 'waterfall.caf', icon: 'water-outline' },
    ];
    
    setSounds(availableSounds);
    
    // Load the last played sound
    loadLastPlayedSound();
  }, []);

  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        stopSound();
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && timerEnabled && timeRemaining !== null) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            stopSound();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timerEnabled, timeRemaining]);

  const loadLastPlayedSound = async () => {
    try {
      const lastSound = await AsyncStorage.getItem('lastPlayedSound');
      if (lastSound) {
        setCurrentSound(lastSound);
      } else {
        // Default to Beach if no sound is selected
        setCurrentSound('Beach');
      }
      
      // Load saved volume
      const savedVolume = await AsyncStorage.getItem('soundVolume');
      if (savedVolume) {
        setVolume(parseFloat(savedVolume));
      }
      
      // Load saved timer
      const savedTimer = await AsyncStorage.getItem('soundTimer');
      if (savedTimer) {
        setTimer(parseInt(savedTimer));
      }
    } catch (error) {
      console.error('Error loading sound preferences:', error);
    }
  };

  const playSound = async (soundName: string) => {
    try {
      // Stop any currently playing sound
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      console.log(`Attempting to play sound: ${soundName}`);
      
      // Get the sound asset
      const soundAsset = soundAssets[soundName];
      if (!soundAsset) {
        console.error(`No sound asset found for: ${soundName}`);
        return;
      }
      
      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        soundAsset,
        { shouldPlay: true, isLooping: true, volume }
      );
      
      console.log(`Sound loaded successfully: ${soundName}`);
      
      // Set up audio mode for background playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      
      setSound(newSound);
      setIsPlaying(true);
      setCurrentSound(soundName);
      
      // Save the last played sound
      await AsyncStorage.setItem('lastPlayedSound', soundName);
      
      // Start timer if enabled
      if (timerEnabled) {
        setTimeRemaining(timer * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setTimeRemaining(null);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopSound();
    } else if (currentSound) {
      playSound(currentSound);
    }
  };

  const changeVolume = async (value: number) => {
    setVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value);
    }
    await AsyncStorage.setItem('soundVolume', value.toString());
  };

  const toggleTimer = (value: boolean) => {
    setTimerEnabled(value);
    if (value && isPlaying) {
      setTimeRemaining(timer * 60);
    } else {
      setTimeRemaining(null);
    }
  };

  const changeTimer = async (value: number) => {
    setTimer(value);
    if (timerEnabled && isPlaying) {
      setTimeRemaining(value * 60);
    }
    await AsyncStorage.setItem('soundTimer', value.toString());
  };

  // Handle sound item press - play or stop the sound
  const handleSoundPress = (soundName: string) => {
    if (currentSound === soundName && isPlaying) {
      stopSound();
    } else {
      playSound(soundName);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.soundGrid}>
          {sounds.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.soundItem,
                currentSound === item.name && isPlaying && styles.activeSoundItem
              ]}
              onPress={() => handleSoundPress(item.name)}
            >
              <View style={[
                styles.soundIconContainer,
                currentSound === item.name && isPlaying && styles.activeSoundIconContainer
              ]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={28}
                  color={currentSound === item.name && isPlaying ? "#fff" : "#0A84FF"} 
                />
                {currentSound === item.name && isPlaying && (
                  <View style={styles.playingIndicator}>
                    <Ionicons name="volume-high" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[
                styles.soundName,
                currentSound === item.name && isPlaying && styles.activeSoundName
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {currentSound && (
          <View style={styles.playerContainer}>
            {isPlaying && timeRemaining !== null && (
              <Text style={styles.timerText}>
                {formatTime(timeRemaining)}
              </Text>
            )}
            
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={togglePlayPause}
            >
              <Ionicons 
                name={isPlaying ? "pause-circle" : "play-circle"} 
                size={80} 
                color="#0A84FF" 
              />
            </TouchableOpacity>
            
            <View style={styles.timerContainer}>
              <View style={styles.timerLabelContainer}>
                <Text style={styles.controlLabel}>Sleep Timer</Text>
                <Switch
                  value={timerEnabled}
                  onValueChange={toggleTimer}
                  trackColor={{ false: '#444', true: '#0A84FF' }}
                  thumbColor={timerEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              {timerEnabled && (
                <View style={styles.timerSliderContainer}>
                  <Text style={styles.timerValue}>{timer} min</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={120}
                    step={5}
                    value={timer}
                    onValueChange={changeTimer}
                    minimumTrackTintColor="#0A84FF"
                    maximumTrackTintColor="#444"
                    thumbTintColor="#0A84FF"
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 10,
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  soundItem: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSoundItem: {
    // Remove background color from the entire item
  },
  soundIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeSoundIconContainer: {
    backgroundColor: '#0A84FF',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  soundName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  activeSoundName: {
    color: '#fff',
    fontWeight: '600',
  },
  playerContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  timerText: {
    fontSize: 22,
    color: '#0A84FF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playButton: {
    marginVertical: 12,
  },
  timerContainer: {
    width: '100%',
    marginTop: 8,
  },
  timerLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  timerSliderContainer: {
    marginTop: 12,
  },
  timerValue: {
    fontSize: 16,
    color: '#0A84FF',
    textAlign: 'right',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
}); 