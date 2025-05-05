import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity, 
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';

const { width, height } = Dimensions.get('window');

export default function RiseScreen() {
  // Preload the background image
  useEffect(() => {
    const preloadImage = async () => {
      try {
        const image = require('../../assets/images/rabbit.webp');
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
      <ImageBackground 
        source={require('../../assets/images/rabbit.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to Bliss Alarm</Text>
            
            <Text style={styles.description}>
              With over 100,000 users, Bliss Alarm is class-leading and based on years of research to better your sleep and make your life better.
            </Text>
            
            <View style={styles.spacer} />
            
            <TouchableOpacity 
              style={styles.button}
              onPress={() => router.push('/quiz/reviews')}
            >
              <Text style={styles.buttonText}>Next</Text>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text readability
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // White color for heading
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16, // Smaller text
    color: '#FF988F', // Requested text color
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  spacer: {
    flex: 1, // Pushes the button to the bottom
  },
  button: {
    backgroundColor: '#FF9500', // Orange/sun color
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginBottom: 40,
    alignSelf: 'center',
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