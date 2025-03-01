import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function UserInfo() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const ageInputRef = useRef<TextInput>(null);

  const validateInputs = () => {
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      setNameError('Please enter your name');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate age
    if (!age.trim()) {
      setAgeError('Please enter your age');
      isValid = false;
    } else if (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      setAgeError('Please enter a valid age');
      isValid = false;
    } else {
      setAgeError('');
    }
    
    return isValid;
  };

  const saveUserInfo = async () => {
    if (validateInputs()) {
      try {
        // Wrap each AsyncStorage operation in its own try/catch
        try {
          await AsyncStorage.setItem('user_name', name);
        } catch (e) {
          console.warn('Failed to save name:', e);
        }
        
        try {
          await AsyncStorage.setItem('user_age', age);
        } catch (e) {
          console.warn('Failed to save age:', e);
        }
        
        try {
          await AsyncStorage.setItem('quizCompleted', 'true');
        } catch (e) {
          console.warn('Failed to save quiz completion status:', e);
        }
        
        // Navigate to calculating screen even if some storage operations failed
        router.push('/quiz/calculating');
      } catch (error) {
        console.error('Error in saveUserInfo:', error);
        
        // Navigate anyway to prevent user from being stuck
        router.push('/quiz/calculating');
      }
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ImageBackground 
          source={require('../../assets/images/10.png')}
          style={styles.backgroundImage}
        >
          <View style={styles.overlay}>
            <SafeAreaView style={styles.container}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.header}>
                  <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                  >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progress, { width: '100%' }]} />
                    </View>
                    <Text style={styles.progressText}>8 of 8</Text>
                  </View>
                </View>
                
                <View style={styles.content}>
                  <Text style={styles.title}>A little more about you</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        // Focus on age input when done with name
                        ageInputRef.current && ageInputRef.current.focus();
                      }}
                    />
                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                      ref={ageInputRef}
                      style={styles.input}
                      value={age}
                      onChangeText={setAge}
                      placeholder="Enter your age"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      keyboardType="number-pad"
                      maxLength={3}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        Keyboard.dismiss();
                      }}
                    />
                    {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}
                  </View>
                </View>
                
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.nextButton} 
                    onPress={saveUserInfo}
                  >
                    <Text style={styles.nextButtonText}>Complete Quiz</Text>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
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
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay instead of gradient
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progress: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: 5,
  },
  footer: {
    padding: 20,
  },
  nextButton: {
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
  nextButtonText: {
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