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
  // Motivation category - all using PNG instead of GIF
  { 
    id: 'another-life', 
    name: 'Another Life', 
    file: require('../assets/images/wallpaper/another-life.png'), 
    thumbnail: require('../assets/images/wallpaper/another-life.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/another-life.caf'),
    category: 'motivation'
  },
  { 
    id: 'better', 
    name: 'Better', 
    file: require('../assets/images/wallpaper/better.png'), 
    thumbnail: require('../assets/images/wallpaper/better.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/better.caf'),
    category: 'motivation'
  },
  { 
    id: 'comfort', 
    name: 'Comfort', 
    file: require('../assets/images/wallpaper/comfort.png'), 
    thumbnail: require('../assets/images/wallpaper/comfort.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/comfort.caf'),
    category: 'motivation'
  },
  { 
    id: 'consistency', 
    name: 'Consistency', 
    file: require('../assets/images/wallpaper/consistency.png'), 
    thumbnail: require('../assets/images/wallpaper/consistency.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/consistency.caf'),
    category: 'motivation'
  },
  { 
    id: 'do-it-now', 
    name: 'Do It Now', 
    file: require('../assets/images/wallpaper/doitnow.png'), 
    thumbnail: require('../assets/images/wallpaper/doitnow.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/do-it-now.caf'),
    category: 'motivation'
  },
  { 
    id: 'dream', 
    name: 'Dream', 
    file: require('../assets/images/wallpaper/dream.png'), 
    thumbnail: require('../assets/images/wallpaper/dream.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/dream.caf'),
    category: 'motivation'
  },
  { 
    id: 'good-morning', 
    name: 'Good Morning', 
    file: require('../assets/images/wallpaper/goodmorning.png'), 
    thumbnail: require('../assets/images/wallpaper/goodmorning.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/good-morning.caf'),
    category: 'motivation'
  },
  { 
    id: 'justdoit', 
    name: 'Just Do It', 
    file: require('../assets/images/wallpaper/justdoit.png'), 
    thumbnail: require('../assets/images/wallpaper/justdoit.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/justdoit.caf'),
    category: 'motivation'
  },
  { 
    id: 'kobe', 
    name: 'Kobe', 
    file: require('../assets/images/wallpaper/kobe.png'), 
    thumbnail: require('../assets/images/wallpaper/kobe.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/kobe.caf'),
    category: 'motivation'
  },
  { 
    id: 'lazy-people', 
    name: 'Lazy People', 
    file: require('../assets/images/wallpaper/lazypeople.png'), 
    thumbnail: require('../assets/images/wallpaper/lazypeople.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/lazypeople.caf'),
    category: 'motivation'
  },
  { 
    id: 'lock-in', 
    name: 'Lock In', 
    file: require('../assets/images/wallpaper/lockin.png'), 
    thumbnail: require('../assets/images/wallpaper/lockin.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/lock-in.caf'),
    category: 'motivation'
  },
  { 
    id: 'mission', 
    name: 'Mission', 
    file: require('../assets/images/wallpaper/mission.png'), 
    thumbnail: require('../assets/images/wallpaper/mission.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/mission.caf'),
    category: 'motivation'
  },
  { 
    id: 'onemore', 
    name: 'One More', 
    file: require('../assets/images/wallpaper/onemore.png'), 
    thumbnail: require('../assets/images/wallpaper/onemore.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/onemore.caf'),
    category: 'motivation'
  },
  { 
    id: 'try-again', 
    name: 'Try Again', 
    file: require('../assets/images/wallpaper/tryagain.png'), 
    thumbnail: require('../assets/images/wallpaper/tryagain.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/try-again.caf'),
    category: 'motivation'
  },
  { 
    id: 'wake-up', 
    name: 'Wake Up', 
    file: require('../assets/images/wallpaper/wakeup.png'), 
    thumbnail: require('../assets/images/wallpaper/wakeup.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/wake-up.caf'),
    category: 'motivation'
  },
  { 
    id: 'woman', 
    name: 'Woman', 
    file: require('../assets/images/wallpaper/woman.png'), 
    thumbnail: require('../assets/images/wallpaper/woman.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/woman.caf'),
    category: 'motivation'
  },

  // Funny category
  { 
    id: 'cat-morning', 
    name: 'Cat Morning', 
    file: require('../assets/images/funny/cat-morning.png'), 
    thumbnail: require('../assets/images/funny/cat-morning.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/cat-morning.caf'),
    category: 'funny'
  },
  { 
    id: 'cat', 
    name: 'Cat', 
    file: require('../assets/images/funny/cat.png'), 
    thumbnail: require('../assets/images/funny/cat.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/cat.caf'),
    category: 'funny'
  },
  { 
    id: 'elmo', 
    name: 'Elmo', 
    file: require('../assets/images/funny/elmo.png'), 
    thumbnail: require('../assets/images/funny/elmo.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/elmo.caf'),
    category: 'funny'
  },
  { 
    id: 'lewis', 
    name: 'Lewis', 
    file: require('../assets/images/funny/lewis.png'), 
    thumbnail: require('../assets/images/funny/lewis.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/lewis.caf'),
    category: 'funny'
  },
  { 
    id: 'party', 
    name: 'Party', 
    file: require('../assets/images/funny/party.png'), 
    thumbnail: require('../assets/images/funny/party.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/party.caf'),
    category: 'funny'
  },
  { 
    id: 'scary', 
    name: 'Scary', 
    file: require('../assets/images/funny/scary.png'), 
    thumbnail: require('../assets/images/funny/scary.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/scary.caf'),
    category: 'funny'
  },
  { 
    id: 'wakey', 
    name: 'Wakey', 
    file: require('../assets/images/funny/wakey.png'), 
    thumbnail: require('../assets/images/funny/wakey.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/wakey.caf'),
    category: 'funny'
  },
  { 
    id: 'wind', 
    name: 'Wind', 
    file: require('../assets/images/funny/wind.png'), 
    thumbnail: require('../assets/images/funny/wind.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/wind.caf'),
    category: 'funny'
  },

  // For the PNG-only ones (no GIF), make them static images:
  { 
    id: 'loveisland', 
    name: 'Love Island', 
    file: require('../assets/images/funny/loveisland.png'), 
    thumbnail: require('../assets/images/funny/loveisland.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/loveisland.caf'),
    category: 'funny'
  },
  { 
    id: 'nokia', 
    name: 'Nokia', 
    file: require('../assets/images/funny/nokia.png'), 
    thumbnail: require('../assets/images/funny/nokia.png'),
    type: 'image',
    hasSound: true,
    sound: require('../assets/sounds/wallpaper/funny/nokia.caf'),
    category: 'funny'
  },
];

export default function WallpaperSelector() {
  const [selectedWallpaper, setSelectedWallpaper] = useState('sleepy');
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewWallpaper, setPreviewWallpaper] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('motivation'); // Changed from 'all' to 'motivation'

  // Filter wallpapers based on selected category
  const filteredWallpapers = wallpapers.filter(w => w.category === selectedCategory);

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Wallpaper</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Category Filter Buttons */}
      <View style={styles.categoryButtons}>
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
        <View style={styles.wallpaperGrid}>
          {filteredWallpapers.map((wallpaper) => (
            <TouchableOpacity
              key={wallpaper.id}
              style={styles.wallpaperItem}
              onPress={() => handleWallpaperPress(wallpaper)}
            >
              <Image 
                source={wallpaper.thumbnail || wallpaper.file} 
                style={styles.wallpaperImage}
                resizeMode="cover"
                fadeDuration={0}
                progressiveRenderingEnabled={true}
              />
              <Text style={styles.wallpaperName}>{wallpaper.name}</Text>
              {wallpaper.hasSound && (
                <View style={styles.soundIndicator}>
                  <Text style={styles.soundIcon}>🔊</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Keep existing preview modal */}
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
  soundIcon: {
    fontSize: 16,
    color: '#007AFF',
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
  categoryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 24,
  },
  categoryButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#1C1C1E',
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
});
