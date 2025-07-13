import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, SafeAreaView, Dimensions, AppState } from 'react-native';
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

// Cache for sound objects to prevent repeated loading/unloading
const soundObjectCache = new Map();

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
  const [playingSounds, setPlayingSounds] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(0.5);
  const [timer, setTimer] = useState(60); // Default 60 minutes
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [loading, setLoading] = useState(false); // Keep but don't show UI for it
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const soundsReady = useRef(false);
  const appState = useRef(AppState.currentState);

  // Set up audio session for background playback
  const setupAudioSession = async () => {
    if (audioSessionReady) return;
    
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false, // Use speaker for Android background playback
        shouldDuckAndroid: true,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });
      console.log("Audio session configured for background playback");
      setAudioSessionReady(true);
    } catch (error) {
      console.error("Error setting up audio session:", error);
    }
  };

  // Define available sounds
  useEffect(() => {
    const availableSounds: Sound[] = [
      { id: '1', name: 'Beach', file: 'beach.caf', icon: 'sunny' as any },
      { id: '2', name: 'Calm Rain', file: 'calm-rain.caf', icon: 'rainy' as any },
      { id: '3', name: 'Fire', file: 'fire.caf', icon: 'flame' as any },
      { id: '4', name: 'Forest', file: 'forest.caf', icon: 'leaf' as any },
      { id: '5', name: 'Piano', file: 'piano.caf', icon: 'musical-notes' as any },
      { id: '6', name: 'White Noise', file: 'white-noise.caf', icon: 'radio' as any },
      { id: '7', name: 'Pink Noise', file: 'pink-noise.caf', icon: 'radio-outline' as any },
      { id: '8', name: 'Rain', file: 'rain.caf', icon: 'water' as any },
      { id: '9', name: 'Space', file: 'space.caf', icon: 'planet' as any },
      { id: '10', name: 'Thunder', file: 'thunder.caf', icon: 'thunderstorm' as any },
      { id: '11', name: 'Waterfall', file: 'waterfall.caf', icon: 'water-outline' as any },
    ];
    
    setSounds(availableSounds);
    
    // Set up audio session immediately
    setupAudioSession();
    
    // Load the last played sound
    loadLastPlayedSound();

    // Preload most common sounds in background
    preloadCommonSounds();
  }, []);

  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      stopSound();
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

  useEffect(() => {
    // Configure audio session once at startup
    const setupAudio = async () => {
      try {
        // Don't try to set up audio multiple times
        if (audioSessionReady) return;
        
        setLoading(true);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
        console.log("Audio mode configured successfully");
        setAudioSessionReady(true);
        
        // Preload just the first few most common sounds
        const preloadFirstSounds = async () => {
          const commonSounds = ['Beach', 'Rain', 'White Noise'];
          for (const soundName of commonSounds) {
            try {
              if (!soundObjectCache.has(soundName)) {
                const { sound } = await Audio.Sound.createAsync(
                  soundAssets[soundName],
                  { shouldPlay: false },
                );
                soundObjectCache.set(soundName, sound);
              }
            } catch (err) {
              // Silently continue if one fails
              console.log(`Error preloading ${soundName}:`, err);
            }
          }
        };
        
        // Start background preloading
        preloadFirstSounds();
        
        // Start background loading the last played sound first
        const lastSound = await AsyncStorage.getItem('lastPlayedSound');
        if (lastSound) {
          // Preload the last used sound in the background
          console.log(`Background loading last used sound: ${lastSound}`);
          try {
            if (!soundObjectCache.has(lastSound)) {
              const { sound } = await Audio.Sound.createAsync(
                soundAssets[lastSound],
                { shouldPlay: false },
              );
              soundObjectCache.set(lastSound, sound);
            }
          } catch (err) {
            console.log("Error preloading last sound:", err);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error configuring audio:", error);
        setLoading(false);
      }
    };
    
    setupAudio();
  }, []);

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

  // Preload the most common sounds in the background
  const preloadCommonSounds = async () => {
    try {
      // Preload top 3 most used sounds in parallel
      const commonSoundNames = ['White Noise', 'Rain', 'Beach'];
      
      Promise.all(
        commonSoundNames.map(name => {
          const soundAsset = soundAssets[name];
          if (soundAsset) {
            return Audio.Sound.createAsync(soundAsset, { shouldPlay: false });
          }
        })
      ).then(results => {
        results.forEach((result, index) => {
          if (result) {
            const sound = result.sound;
            soundObjectCache.set(commonSoundNames[index], sound);
          }
        });
        soundsReady.current = true;
      });
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  };

  // Function to load a sound
  const loadSound = async (soundName: string) => {
    try {
      console.log(`🎵 Loading sound: ${soundName}`);
      
      // If already in cache, use cached sound but ensure it's set to loop
      if (soundObjectCache.has(soundName)) {
        console.log(`📦 Using cached sound for: ${soundName}`);
        const cachedSound = soundObjectCache.get(soundName);
        
        // Check current loop status
        try {
          const status = await cachedSound.getStatusAsync();
          console.log(`🔄 Cached sound ${soundName} loop status:`, status.isLoaded ? status.isLooping : 'not loaded');
          
          if (status.isLoaded) {
            await cachedSound.setIsLoopingAsync(true);
            console.log(`✅ Set looping to true for cached sound: ${soundName}`);
          }
        } catch (error) {
          console.log(`❌ Error setting loop on cached sound ${soundName}:`, error);
        }
        
        return cachedSound;
      }

      const soundAsset = soundAssets[soundName];
      if (!soundAsset) {
        console.error(`❌ Sound asset not found for ${soundName}`);
        return null;
      }
      
      console.log(`🆕 Creating new sound for: ${soundName}`);
      
      // Create the sound with looping enabled
      const { sound: newSound } = await Audio.Sound.createAsync(
        soundAsset,
        { 
          volume, 
          isLooping: true, 
          progressUpdateIntervalMillis: 100 
        },
        // Status update callback
        (status) => {
          if (status.isLoaded) {
            console.log(`📊 ${soundName} status - isLooping: ${status.isLooping}, isPlaying: ${status.isPlaying}`);
          }
        }
      );
      
      console.log(`🎯 Created sound for: ${soundName}`);
      
      // Double-check that looping is enabled
      try {
        await newSound.setIsLoopingAsync(true);
        const status = await newSound.getStatusAsync();
        console.log(`🔄 New sound ${soundName} final loop status:`, status.isLoaded ? status.isLooping : 'not loaded yet');
      } catch (error) {
        console.log(`❌ Error setting loop on new sound ${soundName}:`, error);
      }
      
      // Cache for future use
      soundObjectCache.set(soundName, newSound);
      console.log(`💾 Cached sound: ${soundName}`);
      
      return newSound;
    } catch (error) {
      console.error(`❌ Error loading sound ${soundName}:`, error);
      return null;
    }
  };

  // Function to play a sound
  const playSound = async (soundName: string) => {
    try {
      if (playingSounds.has(soundName)) {
        // Toggle off if already playing
        const soundToStop = soundObjectCache.get(soundName);
        if (soundToStop) {
          const status = await soundToStop.getStatusAsync();
          if (status.isLoaded) {
            await soundToStop.stopAsync();
          }
          // Remove from playing sounds
          setPlayingSounds(prev => {
            const updated = new Set(prev);
            updated.delete(soundName);
            return updated;
          });
          
          // If this was the current sound, update UI
          if (currentSound === soundName) {
            setIsPlaying(false);
          }
        }
        return;
      }
      
      console.log(`🎵 Starting playSound for: ${soundName}`);
      
      // Set current sound name immediately for UI responsiveness
      setCurrentSound(soundName);
      
      // Set the UI state to playing immediately for perceived performance
      setIsPlaying(true);
      
      // Add to playing sounds set for UI highlighting instantly
      setPlayingSounds(prev => {
        const updated = new Set(prev);
        updated.add(soundName);
        return updated;
      });
      
      // Load the sound if needed
      let soundToPlay = soundObjectCache.get(soundName);
      
      if (!soundToPlay) {
        // Load the new sound
        soundToPlay = await loadSound(soundName);
        
        // Verify sound loaded properly
        if (!soundToPlay) {
          console.log(`❌ Could not load sound: ${soundName}`);
          // Rollback UI states since sound failed to load
          setIsPlaying(false);
          setPlayingSounds(prev => {
            const updated = new Set(prev);
            updated.delete(soundName);
            return updated;
          });
          return;
        }
      }
      
      try {
        // CRITICAL FIX: Set looping BEFORE playing
        console.log(`🔄 Setting looping to true for ${soundName}`);
        await soundToPlay.setIsLoopingAsync(true);
        
        // Verify looping is set
        const statusAfterLoop = await soundToPlay.getStatusAsync();
        console.log(`✅ After setIsLoopingAsync - ${soundName} isLooping: ${statusAfterLoop.isLoaded ? statusAfterLoop.isLooping : 'not loaded'}`);
        
        // For UI state, we'll keep the most recently played sound as "current"
        if (!sound) {
          setSound(soundToPlay);
        }
        
        // Set volume
        await soundToPlay.setVolumeAsync(volume);
        
        // Add this logging before playing:
        const statusBeforePlay = await soundToPlay.getStatusAsync();
        console.log(`🎮 About to play ${soundName} - isLooping: ${statusBeforePlay.isLoaded ? statusBeforePlay.isLooping : 'not loaded'}`);
        
        // Play the sound
        await soundToPlay.playAsync();
        
        // Add this logging after playing starts:
        const statusAfterPlay = await soundToPlay.getStatusAsync();
        console.log(`▶️ Started playing ${soundName} - isLooping: ${statusAfterPlay.isLoaded ? statusAfterPlay.isLooping : 'not loaded'}, isPlaying: ${statusAfterPlay.isPlaying}`);
        
        // Save last played sound
        await AsyncStorage.setItem('lastPlayedSound', soundName);
        
        // Start timer if enabled
        if (timerEnabled) {
          setTimeRemaining(timer * 60);
        }
      } catch (e) {
        console.log(`❌ Error playing sound ${soundName}:`, e);
        // Rollback UI states if play fails
        setIsPlaying(false);
        setPlayingSounds(prev => {
          const updated = new Set(prev);
          updated.delete(soundName);
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Error playing sound:', error);
      // Rollback UI states if anything fails
      setIsPlaying(false);
      setPlayingSounds(prev => {
        const updated = new Set(prev);
        updated.delete(soundName);
        return updated;
      });
    }
  };

  // Function to stop the sound
  const stopSound = async () => {
    try {
      if (sound) {
        // Check if sound is loaded before stopping
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
        }
        // Don't unload - just stop it for quicker restart
        // sound.unloadAsync();
        setIsPlaying(false);
        setPlayingSounds(new Set()); // Clear all playing sounds
        setTimeRemaining(null);
      }
    } catch (error) {
      console.error('Error stopping sound:', error);
      // Force reset state in case of error
      setIsPlaying(false);
      setPlayingSounds(new Set());
      setSound(null);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        // Stop all playing sounds
        for (const playingSoundName of [...playingSounds]) {
          const soundToStop = soundObjectCache.get(playingSoundName);
          if (soundToStop) {
            try {
              const status = await soundToStop.getStatusAsync();
              if (status.isLoaded) {
                await soundToStop.stopAsync();
              }
            } catch (e) {
              // Ignore errors on individual sounds
            }
          }
        }
        // Clear playing sounds state
        setPlayingSounds(new Set());
        setIsPlaying(false);
        setTimeRemaining(null);
      } else if (currentSound) {
        // Just play the current sound
        await playSound(currentSound);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      // Reset state if there's an error
      setIsPlaying(false);
    }
  };

  const changeVolume = async (newVolume: number) => {
    try {
      setVolume(newVolume);
      
      if (sound) {
        await sound.setVolumeAsync(newVolume);
      }
      
      // Save the new volume
      await AsyncStorage.setItem('soundVolume', newVolume.toString());
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const toggleTimer = () => {
    setTimerEnabled(!timerEnabled);
    
    if (!timerEnabled && isPlaying) {
      // Timer just enabled and sound is playing, start countdown
      setTimeRemaining(timer * 60);
    } else if (timerEnabled) {
      // Timer disabled, cancel countdown
      setTimeRemaining(null);
    }
  };

  const changeTimer = async (newTimer: number) => {
    try {
      setTimer(newTimer);
      
      // Save the new timer setting
      await AsyncStorage.setItem('soundTimer', newTimer.toString());
      
      // Update the countdown if timer is active
      if (timerEnabled && isPlaying) {
        setTimeRemaining(newTimer * 60);
      }
    } catch (error) {
      console.error('Error changing timer:', error);
    }
  };

  // Add this new function to handle app state changes
  useEffect(() => {
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background
        console.log('App going to background - ensuring sounds continue');
        
        // Ensure audio session is properly configured for background
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.soundGrid}>
          {sounds.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.soundItem,
                playingSounds.has(item.name) && styles.activeSoundItem
              ]}
              disabled={loading}
              onPress={() => playSound(item.name)}
            >
              <View style={[
                styles.soundIconContainer,
                playingSounds.has(item.name) && styles.activeSoundIconContainer
              ]}>
                <Ionicons name={item.icon as any} size={24} color={playingSounds.has(item.name) ? '#fff' : '#999'} />
                {playingSounds.has(item.name) && (
                  <View style={styles.playingIndicator}>
                    <Ionicons name="play" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[
                styles.soundName,
                playingSounds.has(item.name) && styles.activeSoundName
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
              disabled={!currentSound}
            >
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={60}
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
                  disabled={loading}
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
                    disabled={loading}
                  />
                </View>
              )}
            </View>
          </View>
        )}
        
        {loading && (
          <View style={styles.loadingText}>
            <Text style={{color: '#666', fontSize: 14}}>Loading...</Text>
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
  loadingText: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
}); 