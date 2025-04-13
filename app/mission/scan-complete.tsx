import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function ScanComplete() {
  // Animation setup
  const successOpacity = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Fade in animation
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
    
    // Navigate to home after showing success message
    const timer = setTimeout(() => {
      console.log('Navigating to home using the final-typing approach');
      router.replace('/');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false
        }} 
      />
      
      <Animated.View style={[styles.container, { opacity: successOpacity }]}>
        <ConfettiCannon
          count={150}
          origin={{x: screenWidth/2, y: 0}}
          explosionSpeed={350}
          fallSpeed={3000}
          colors={['#00FFFF', '#800080', '#FFFF00', '#00FF00', '#FF0000']}
        />
        
        <Ionicons name="checkmark-circle" size={100} color="#00ff00" />
        <Text style={styles.title}>MISSION COMPLETE!</Text>
        <Text style={styles.subtitle}>Alarm Dismissed</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center'
  }
}); 