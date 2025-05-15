import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Image, 
  ImageBackground,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';
import RevenueCatService from '../services/RevenueCatService';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// App Store reviewer credentials
const REVIEWER_USERNAME = "appreview";
const REVIEWER_PASSWORD = "blissalarm2023";

export default function QuizIntro() {
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showRedeemCodeModal, setShowRedeemCodeModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
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
    
    // Add this simple Firebase test
    // // const testFirebase = async () => {
    // //   try {
    // //     console.log('🔥 FIREBASE TEST: Starting...');
        
    // //     // Import Firebase modules
    // //     const firebase = require('@react-native-firebase/app').default;
    // //     const auth = require('@react-native-firebase/auth').default;
        
    // //     // Check if Firebase is initialized
    // //     console.log(`🔥 FIREBASE TEST: Apps count: ${firebase.apps.length}`);
        
    // //     if (firebase.apps.length === 0) {
    // //       console.log('🔥 FIREBASE TEST: Firebase is NOT initialized, initializing now...');
    // //       firebase.initializeApp({
    // //         appId: '1:748781286916:ios:d94493e3abc4808c102751',
    // //         projectId: 'bliss-alarm-b8280',
    // //       });
    // //       console.log('🔥 FIREBASE TEST: Firebase initialized successfully');
    // //     } else {
    // //       console.log('🔥 FIREBASE TEST: Firebase is already initialized');
    // //     }
        
    // //     // Try anonymous sign-in (simplest auth method)
    // //     console.log('🔥 FIREBASE TEST: Attempting anonymous sign-in...');
    // //     const result = await auth().signInAnonymously();
    // //     console.log('🔥 FIREBASE TEST: SUCCESS! Firebase authentication is working!');
    // //     console.log(`🔥 FIREBASE TEST: User ID: ${result.user.uid}`);
        
    // //     // Sign out
    // //     await auth().signOut();
    // //     console.log('🔥 FIREBASE TEST: Signed out successfully');
    // //   } catch (error) {
    // //     console.error('🔥 FIREBASE TEST: FAILED!', error);
       
    // //   }
    // // };
    
    // // Run the test
    // testFirebase();
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

  const handleLogin = async () => {
    // Check if credentials match App Store reviewer credentials
    if (username === REVIEWER_USERNAME && password === REVIEWER_PASSWORD) {
      try {
        // Set user as premium and quiz as completed
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        await AsyncStorage.setItem('subscriptionType', 'yearly');
        
        // Navigate to main app
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Error setting premium status:', error);
        Alert.alert('Error', 'Failed to log in. Please try again.');
      }
    } else {
      // Show error for incorrect credentials
      Alert.alert('Invalid Credentials', 'The username or password is incorrect.');
    }
  };

  const handleCodeRedemption = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Error', 'Please enter a valid promo code.');
      return;
    }
    
    try {
      setRedeeming(true);
      
      // Call RevenueCat service to redeem code
      const success = await RevenueCatService.redeemPromoCode(promoCode);
      
      if (success) {
        // Show success message
        Alert.alert(
          'Success!',
          'Your promo code has been redeemed successfully.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        // Show error for invalid code
        Alert.alert('Invalid Code', 'The promo code you entered is invalid or has expired.');
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      Alert.alert('Error', 'There was a problem redeeming your code. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

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
              
              <TouchableOpacity 
                style={styles.redeemCodeButton} 
                onPress={() => router.push('/redemption')}
              >
                <Text style={styles.redeemCodeText}>Have a redemption code?</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>
      
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loginModalContent}>
            <Text style={styles.modalTitle}>Log In</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <View style={styles.loginModalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowLoginModal(false);
                  setUsername('');
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.loginModalButton}
                onPress={handleLogin}
              >
                <Text style={styles.loginModalButtonText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal
        visible={showRedeemCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRedeemCodeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Enter Promo Code</Text>
            
            <TextInput 
              style={styles.modalInput}
              placeholder="Enter your code here"
              placeholderTextColor="#999"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            
            <View style={styles.appmodalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setPromoCode('');
                  setShowRedeemCodeModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.redeemButton}
                onPress={handleCodeRedemption}
                disabled={redeeming}
              >
                {redeeming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.redeemButtonText}>Redeem</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginModalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    color: '#fff',
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loginModalButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  loginModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  redeemCodeButton: {
    marginTop: 15,
    padding: 10,
  },
  redeemCodeText: {
    color: '#FF9500', // Orange color that matches your theme
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  redeemButton: {
    backgroundColor: '#FF9500', // Orange to match theme
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#2C2C2E',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    color: '#fff',
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appmodalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
}); 