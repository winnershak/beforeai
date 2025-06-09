import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { getCurrentUser, getUserProfile, updateUserProfile, checkUsernameAvailable } from '../config/firebase';

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.uid);
        setDisplayName(profile?.displayName || user.displayName || '');
        setUsername(profile?.username || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const checkUsername = async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) {
      setIsUsernameValid(false);
      return;
    }
    
    setIsChecking(true);
    try {
      const isAvailable = await checkUsernameAvailable(usernameToCheck);
      setIsUsernameValid(isAvailable);
    } catch (error) {
      console.error('Error checking username:', error);
      setIsUsernameValid(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        return; // Silently return instead of showing alert
      }

      // Clean and validate data properly
      const cleanDisplayName = displayName?.trim();
      const cleanUsername = username?.trim();

      // Build profile data only with defined values
      const profileData: { [key: string]: any } = {};
      
      if (cleanDisplayName && cleanDisplayName.length > 0) {
        profileData.displayName = cleanDisplayName;
      }
      
      if (cleanUsername && cleanUsername.length >= 3) {
        profileData.username = cleanUsername;
      }

      // Only proceed if we have valid data to save
      if (Object.keys(profileData).length === 0) {
        router.back(); // Nothing to save, just go back
        return;
      }

      try {
        // Check username availability first if username is provided
        if (profileData.username) {
          const isAvailable = await checkUsernameAvailable(profileData.username);
          if (!isAvailable) {
            // Remove username from data and continue with just display name
            delete profileData.username;
            if (Object.keys(profileData).length === 0) {
              router.back(); // No valid data to save
              return;
            }
          }
        }

        // Save to Firebase with clean data
        if (Object.keys(profileData).length > 0) {
          await updateUserProfile(profileData);
        }

        // Update Firebase Auth display name separately if provided
        if (cleanDisplayName) {
          await user.updateProfile({
            displayName: cleanDisplayName
          });
        }

        router.back(); // Success - go back silently
      } catch (error) {
        // Silently handle any remaining errors
        router.back();
      }
    } catch (error) {
      // Silently handle all errors
      router.back();
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    checkUsername(text);
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false  // This hides the "profile" header
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="Choose a unique username"
            placeholderTextColor="#666"
          />
          
          {!isUsernameValid && (
            <Text style={styles.errorText}>Username not available</Text>
          )}
          {isChecking && (
            <Text style={styles.checkingText}>Checking availability...</Text>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={styles.stickyButton}
          onPress={handleSave}
        >
          <Text style={styles.stickyButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    fontSize: 16,
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  checkingText: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  stickyButton: {
    position: 'absolute',
    bottom: 34, // Safe area bottom
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  stickyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
}); 