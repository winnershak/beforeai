import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '748781286916-o2egm2al46ak0bnnbkkir01ck9qafael.apps.googleusercontent.com',
    androidClientId: '', // optional for now
    webClientId: '748781286916-9pj4l0k1di57hoh672q2hluug5vu4msj.apps.googleusercontent.com',
  });
  
  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleLogin(response.authentication?.accessToken);
    }
  }, [response]);
  
  const handleGoogleLogin = async (accessToken: string | undefined) => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      console.log('LOGIN: Starting Google sign-in...');
      const success = await AuthService.signInWithGoogle(accessToken);
      
      if (success) {
        // Check subscription status from AsyncStorage (which was set by FirebaseService)
        const isPremium = await AsyncStorage.getItem('isPremium');
        
        if (isPremium === 'true') {
          // Show success message for premium users
          Alert.alert(
            'Premium Subscription Active',
            'Welcome back! Your premium subscription is active. Enjoy all features!',
            [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
          );
        } else {
          // Show message for non-premium users
          Alert.alert(
            'Login Successful',
            'No active subscription detected. Some features may be limited.',
            [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
          );
        }
      } else {
        Alert.alert('Login Failed', 'Unable to sign in with Google. Please try again.');
      }
    } catch (error) {
      console.error('LOGIN: Google sign-in error:', error);
      Alert.alert('Login Error', 'An error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    try {
      // Special case for App Store reviewers
      if (email === 'appreview' && password === 'blissalarm2023') {
        // Store mock user data
        await AsyncStorage.setItem('user', JSON.stringify({
          uid: 'app-reviewer-special-id',
          email: 'reviewer@example.com',
          displayName: 'App Reviewer',
        }));
        
        // Mark as logged in and premium
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Navigate to main app
        router.replace('/(tabs)');
        return;
      }
      
      // Normal authentication flow
      const success = await AuthService.signInWithEmail(email, password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Email login error:', error);
      Alert.alert('Login Error', 'An error occurred during sign-in.');
    } finally {
      setLoading(false);
    }
  };
  
  const backgroundImage = require('../../assets/images/10.png');
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground 
        source={backgroundImage}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.headerSection}>
                  <Text style={styles.title}>Sign In</Text>
                  <Text style={styles.subtitle}>
                    Sign in to access your subscription and settings
                  </Text>
                </View>
                
                <View style={styles.formSection}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity 
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#999" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.forgotPassword}
                    onPress={() => router.push('/auth/forgot-password')}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.loginButton}
                    onPress={handleEmailLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.divider} />
                </View>
                
                <View style={styles.socialSection}>
                  <TouchableOpacity 
                    style={styles.googleButton}
                    onPress={() => promptAsync()}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  passwordToggle: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0A84FF',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#ccc',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  socialSection: {
    marginBottom: 30,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#DB4437',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
}); 