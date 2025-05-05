import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';

const { width, height } = Dimensions.get('window');

export default function StudyScreen() {
  // Preload the image
  useEffect(() => {
    const preloadImage = async () => {
      try {
        const image = require('../../assets/images/8.webp');
        const uri = Image.resolveAssetSource(image).uri;
        await CacheManager.get(uri, { headers: {} }).getPath();
      } catch (error) {
        console.error('Error preloading image:', error);
      }
    };
    
    preloadImage();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image 
              source={require('../../assets/images/8.webp')}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.highlightText}>78% Faster</Text>
            <Text style={styles.title}>
              According to a 5-month study, Bliss Alarm helps you transform your sleep faster than other methods
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/quiz/rating')}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  imageContainer: {
    width: width * 0.8,
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  highlightText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0A84FF', // Blue color for emphasis
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },
  button: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginTop: 40,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 