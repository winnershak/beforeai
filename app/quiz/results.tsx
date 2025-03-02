import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { CacheManager } from "react-native-expo-image-cache";

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuizResults() {
  // Local images need to be preloaded
  const scoreImageUri = Image.resolveAssetSource(require('../../assets/images/score.webp')).uri;

  const navigateToSymptoms = () => {
    // Navigate to the symptoms page instead of tabs
    router.push('/quiz/symptoms');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Analysis complete</Text>
            
            <Text style={styles.resultText}>
              We've got some news to break to you...
            </Text>
            
            {/* Using standard Image component with adjusted size */}
            <View style={styles.scoreImageContainer}>
              <Image 
                source={{uri: scoreImageUri}}
                style={styles.scoreImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.resultBox}>
              <Text style={styles.resultHighlight}>
                Your responses indicate bad sleep habits
              </Text>
            </View>
            
            <Text style={styles.disclaimer}>
              *This result is an indication only, not a medical diagnosis. For a definitive assessment, please contact your healthcare provider.
            </Text>
          </View>
        </ScrollView>
        
        {/* Sticky button at the bottom */}
        <SafeAreaView style={styles.buttonContainer} edges={['bottom']}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={navigateToSymptoms}
          >
            <Text style={styles.buttonText}>Check your symptoms</Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 90, // Reduced padding to account for the button
  },
  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28, // Slightly smaller
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15, // Reduced margin
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  resultText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 15, // Reduced margin
    textAlign: 'center',
    fontWeight: '300',
  },
  scoreImageContainer: {
    width: width * 0.85, // 85% of screen width (reduced from 90%)
    height: height * 0.35, // 35% of screen height (reduced from 50%)
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15, // Reduced margin
  },
  scoreImage: {
    width: '100%',
    height: '100%',
  },
  resultBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)', // Red tint for warning
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    borderRadius: 15,
    padding: 18, // Slightly reduced padding
    marginVertical: 15, // Reduced margin
    width: '100%',
  },
  resultHighlight: {
    fontSize: 20, // Slightly smaller
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 15, // Reduced margin
    fontStyle: 'italic',
    lineHeight: 18,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 25,
    paddingTop: 12, // Slightly reduced padding
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: 'rgba(10, 132, 255, 0.9)',
    paddingVertical: 15, // Slightly reduced padding
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
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
    marginBottom: 10,
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