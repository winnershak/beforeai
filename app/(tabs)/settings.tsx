import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, Alert, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from '../services/RevenueCatService';
import Constants from 'expo-constants';

const { AudioBackgroundModule } = NativeModules;

export default function SettingsScreen() {
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    expirationDate?: Date;
    latestPurchaseDate?: Date;
    productIdentifier?: string;
    isYearly: boolean;
  } | null>(null);
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        Constants.expoConfig?.extra?.eas?.buildType === 'development';

  useEffect(() => {
    const getSubscriptionInfo = async () => {
      try {
        // Get subscription type
        const subscriptionType = await RevenueCatService.getSubscriptionType();
        
        if (subscriptionType) {
          // Use subscription type to display appropriate info
          const details = await RevenueCatService.getSubscriptionDetails();
          setSubscriptionDetails({
            ...details,
            isYearly: subscriptionType === 'yearly'
          });
        }
      } catch (error) {
        console.log('Error getting subscription info:', error);
      }
    };
    
    getSubscriptionInfo();
  }, []);

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const testMP3Sound = async () => {
    try {
      console.log('Testing MP3 playback...');
      await AudioBackgroundModule.playTestMP3();
      Alert.alert('Success', 'Test MP3 is playing!');
      console.log('Test MP3 is playing!');
    } catch (error: any) {
      Alert.alert('Error', `Test MP3 failed: ${error.message}`);
      console.error('Test MP3 failed:', error);
    }
  };

  const checkAudioSession = async () => {
    try {
      console.log('Checking audio session status...');
      const status = await AudioBackgroundModule.checkAudioSessionStatus();
      Alert.alert('Audio Session Status', JSON.stringify(status, null, 2));
      console.log('Audio session status:', status);
    } catch (error: any) {
      Alert.alert('Error', `Failed to check audio session: ${error.message}`);
      console.error('Audio session check failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigateTo('/about')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="information-circle-outline" size={24} color="#5AC8FA" style={styles.settingIcon} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigateTo('/help')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="help-circle-outline" size={24} color="#4CD964" style={styles.settingIcon} />
              <Text style={styles.settingText}>Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* Only show reset button in development mode */}
          {isDevelopment && (
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={async () => {
                await AsyncStorage.removeItem('isPremium');
                await AsyncStorage.removeItem('quizCompleted');
                Alert.alert("Reset Complete", "App status reset to non-premium. Please restart the app.");
              }}
            >
              <View style={styles.settingContent}>
                <Ionicons name="refresh-circle-outline" size={24} color="#FF3B30" style={styles.settingIcon} />
                <Text style={styles.settingText}>Reset Premium Status (Testing)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {subscriptionDetails && subscriptionDetails.expirationDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionText}>
                {subscriptionDetails.isYearly ? 'Yearly' : 'Monthly'} Subscription
              </Text>
              <Text style={styles.subscriptionText}>
                Expires: {subscriptionDetails.expirationDate.toLocaleDateString()}
              </Text>
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('https://apps.apple.com/account/subscriptions');
                  } else {
                    Linking.openURL('https://play.google.com/store/account/subscriptions');
                  }
                }}
              >
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add these buttons for development testing */}
        {isDevelopment && (
          <>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={async () => {
                const isSubscribed = await RevenueCatService.isSubscribed();
                const subscriptionType = await RevenueCatService.getSubscriptionType();
                const quizCompleted = await AsyncStorage.getItem('quizCompleted');
                
                Alert.alert(
                  "Subscription Status", 
                  `Subscribed: ${isSubscribed}\nType: ${subscriptionType || 'None'}\nQuiz Completed: ${quizCompleted}`
                );
              }}
            >
              <View style={styles.settingContent}>
                <Ionicons name="information-circle-outline" size={24} color="#5AC8FA" style={styles.settingIcon} />
                <Text style={styles.settingText}>Check Subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={async () => {
                await AsyncStorage.setItem('isPremium', 'true');
                await AsyncStorage.setItem('subscriptionType', 'monthly');
                
                Alert.alert(
                  "Subscription Set", 
                  "Monthly subscription has been set.",
                  [{ text: "OK", onPress: () => router.replace('/') }]
                );
              }}
            >
              <View style={styles.settingContent}>
                <Ionicons name="star" size={24} color="#FFD700" style={styles.settingIcon} />
                <Text style={styles.settingText}>Set Monthly Subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </>
        )}

        {/* Add this new section for sound testing */}
        {isDevelopment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sound Testing</Text>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={testMP3Sound}
            >
              <View style={styles.settingContent}>
                <Ionicons name="musical-note" size={24} color="#FF9500" style={styles.settingIcon} />
                <Text style={styles.settingText}>Test MP3 Sound</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={checkAudioSession}
            >
              <View style={styles.settingContent}>
                <Ionicons name="volume-high" size={24} color="#FF2D55" style={styles.settingIcon} />
                <Text style={styles.settingText}>Check Audio Session</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    color: '#fff',
    fontSize: 17,
  },
  subscriptionInfo: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
  },
  subscriptionText: {
    color: '#fff',
    fontSize: 17,
    marginBottom: 10,
  },
  manageButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
}); 