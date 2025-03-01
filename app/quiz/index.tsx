import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuizIntro() {
  const [loading, setLoading] = useState(true);
  const backgroundImage = require('../../assets/images/10.png');
  
  // Preload the background image
  useEffect(() => {
    const preloadImage = async () => {
      const uri = Image.resolveAssetSource(backgroundImage).uri;
      await CacheManager.get(uri, {
        headers: {}
      }).getPath();
    };
    
    preloadImage();
  }, []);

  useEffect(() => {
    // Check if user has already completed the quiz
    const checkQuizStatus = async () => {
      try {
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        const isPremium = await AsyncStorage.getItem('isPremium');
        
        if (quizCompleted === 'true' || isPremium === 'true') {
          // Skip quiz if already completed or user is premium
          router.replace('/(tabs)');
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking quiz status:', error);
        setLoading(false);
      }
    };
    
    checkQuizStatus();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground 
        source={backgroundImage}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <View style={styles.topSection}>
              {/* Empty top section for spacing */}
            </View>
            
            <View style={styles.middleSection}>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.subtitle}>
                Let's start by finding out if you have a problem with sleep
              </Text>
            </View>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => router.push('/quiz/question1')}
              >
                <Text style={styles.buttonText}>Start Quiz</Text>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Lighter overlay for better visibility
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // Distributes space between sections
  },
  topSection: {
    flex: 1, // Takes up 1/6 of the space
  },
  middleSection: {
    flex: 3, // Takes up 3/6 of the space
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bottomSection: {
    flex: 2, // Takes up 2/6 of the space
    justifyContent: 'flex-end', // Aligns content to the bottom
    alignItems: 'center',
    paddingBottom: height * 0.08, // Responsive bottom padding
  },
  title: {
    fontSize: isSmallDevice ? 30 : 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: isSmallDevice ? 15 : 17,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: isSmallDevice ? 22 : 24,
    maxWidth: '85%',
    fontWeight: '300',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  button: {
    backgroundColor: 'rgba(10, 132, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: width * 0.7, // Responsive width
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
}); 