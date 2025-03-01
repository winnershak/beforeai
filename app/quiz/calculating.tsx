import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');

export default function CalculatingResults() {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    // Automatically navigate to results screen after 7 seconds
    const timer = setTimeout(() => {
      router.replace('/quiz/results');
    }, 3000);
    
    // Clear timeout if component unmounts
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.imageContainer}>
              {!isImageLoaded && (
                <ActivityIndicator 
                  size="large" 
                  color="#0A84FF" 
                  style={styles.loadingIndicator} 
                />
              )}
              <Image 
                source={require('../../assets/images/load.gif')}
                style={[
                  styles.loadingGif, 
                  {opacity: isImageLoaded ? 1 : 0}
                ]}
                resizeMode="contain"
                onLoadStart={() => setIsImageLoaded(false)}
                onLoad={() => setIsImageLoaded(true)}
              />
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.calculatingText}>Calculating and analyzing results</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGif: {
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  calculatingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
}); 