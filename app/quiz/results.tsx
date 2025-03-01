import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Text style={styles.title}>Analysis complete</Text>
            
            <Text style={styles.resultText}>
              We've got some news to break to you...
            </Text>
            
            {/* Using standard Image component */}
            <Image 
              source={{uri: scoreImageUri}}
              style={[styles.scoreImage, {resizeMode: 'contain'}]}
            />
            
            <View style={styles.resultBox}>
              <Text style={styles.resultHighlight}>
                Your responses indicate bad sleep habits
              </Text>
            </View>
            
            <Text style={styles.disclaimer}>
              *This result is an indication only, not a medical diagnosis. For a definitive assessment, please contact your healthcare provider.
            </Text>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={navigateToSymptoms}
            >
              <Text style={styles.buttonText}>Check your symptoms</Text>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  resultText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '300',
  },
  scoreImage: {
    width: width * 0.7,
    height: width * 0.4,
    marginBottom: 20,
  },
  resultBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)', // Red tint for warning
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
    width: '100%',
  },
  resultHighlight: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    padding: 25,
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(10, 132, 255, 0.9)',
    paddingVertical: 16,
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