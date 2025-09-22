import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // 2 items per row with padding

const wallpapers = [
  { id: 'sleepy', name: 'Sleepy', file: require('../assets/images/sleepy.jpg'), type: 'image', hasSound: false },
  { id: 'sleepy2', name: 'Sleepy 2', file: require('../assets/images/sleepy2.jpg'), type: 'image', hasSound: false },
  { id: 'cute', name: 'Cute', file: require('../assets/images/cute.webp'), type: 'image', hasSound: false },
  { id: 'rabbit', name: 'Rabbit', file: require('../assets/images/rabbit.webp'), type: 'image', hasSound: false },
  { id: 'ship', name: 'Ship', file: require('../assets/images/ship.png'), type: 'image', hasSound: false },
  { id: 'bliss', name: 'Bliss', file: require('../assets/images/bliss.png'), type: 'image', hasSound: false },
  { 
    id: 'Just do it', 
    name: 'Just do it', 
    file: require('../assets/images/wall1.gif'), 
    type: 'gif',
    hasSound: true,
    sound: require('../assets/sounds/wall1.caf')
  },
];

export default function WallpaperSelector() {
  const [selectedWallpaper, setSelectedWallpaper] = useState('sleepy');
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Add this
  const [previewWallpaper, setPreviewWallpaper] = useState<any>(null); // Add this

  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (previewSound) {
        previewSound.unloadAsync();
      }
    };
  }, [previewSound]);

  const handleWallpaperPress = async (wallpaper: any) => {
    console.log('🎯 Wallpaper pressed:', wallpaper.name);
    setSelectedWallpaper(wallpaper.id);
    setPreviewWallpaper(wallpaper);
    setShowPreview(true); // Show fullscreen preview
    
    // Stop any currently playing sound
    if (previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
      setIsPlaying(false);
    }
    
    // Play sound preview if wallpaper has sound
    if (wallpaper.hasSound && wallpaper.sound) {
      try {
        console.log('🎵 Playing preview sound for:', wallpaper.name);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
        
        const { sound } = await Audio.Sound.createAsync(wallpaper.sound);
        setPreviewSound(sound);
        setIsPlaying(true);
        
        await sound.playAsync();
        
      } catch (error) {
        console.error('Error playing preview:', error);
      }
    }
  };

  const handleSelect = () => {
    // Stop any playing sound
    if (previewSound) {
      previewSound.stopAsync();
    }
    
    // Save selected wallpaper to AsyncStorage so new-alarm can pick it up
    AsyncStorage.setItem('selectedWallpaper', selectedWallpaper);
    
    // Navigate back with selected wallpaper as params
    router.back();
  };

  const closePreview = () => {
    // Stop sound
    if (previewSound) {
      previewSound.stopAsync();
      setIsPlaying(false);
    }
    setShowPreview(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.wallpaperGrid}>
          {wallpapers.map((wallpaper) => (
            <TouchableOpacity
              key={wallpaper.id}
              style={[
                styles.wallpaperItem,
                selectedWallpaper === wallpaper.id && styles.selectedWallpaper
              ]}
              onPress={() => handleWallpaperPress(wallpaper)}
            >
              <Image source={wallpaper.file} style={styles.wallpaperImage} />
              <Text style={styles.wallpaperName}>{wallpaper.name}</Text>
              
              {wallpaper.hasSound && (
                <View style={styles.soundIndicator}>
                  <Ionicons name="musical-notes" size={16} color="#007AFF" />
                </View>
              )}
              
              {selectedWallpaper === wallpaper.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Fullscreen Preview Modal */}
      {showPreview && previewWallpaper && (
        <View style={styles.previewOverlay}>
          <Image 
            source={previewWallpaper.file} 
            style={styles.previewImage}
            resizeMode="cover"
          />
          
          {/* Select Button - only in preview */}
          <View style={styles.previewBottomContainer}>
            <TouchableOpacity style={styles.selectButton} onPress={handleSelect}>
              <Text style={styles.selectButtonText}>Select Wallpaper</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 0, // Add this to remove any top padding
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 16, // Remove extra padding
  },
  wallpaperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wallpaperItem: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },
  selectedWallpaper: {
    borderWidth: 3,
    borderColor: '#007AFF',
    transform: [{ scale: 1.02 }],
  },
  wallpaperImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.2,
    resizeMode: 'cover',
  },
  wallpaperName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    padding: 12,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  soundIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  previewInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  soundStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  soundText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 6,
  },
  previewBottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
});
