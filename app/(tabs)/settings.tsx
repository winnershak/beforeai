import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from '../services/RevenueCatService';
import AlarmSoundModule from '../native-modules/AlarmSoundModule';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    expirationDate?: Date;
    latestPurchaseDate?: Date;
    productIdentifier?: string;
    isYearly: boolean;
  } | null>(null);
  
  // Function to test the AlarmSound native module
  const testAlarmSound = () => {
    console.log('🔊 Testing AlarmSound.configureAudio()...');
    try {
      AlarmSoundModule.configureAudio();
      console.log('✅ Called AlarmSound.configureAudio() successfully');
      Alert.alert('Success', 'AlarmSound.configureAudio() was called. Check the logs for details.');
    } catch (error) {
      console.error('❌ Error calling AlarmSound.configureAudio():', error);
      Alert.alert('Error', 'Failed to call AlarmSound.configureAudio(). See logs for details.');
    }
  };

  // Function to debug sound files
  const debugSoundFiles = async () => {
    console.log('🔍 Checking sound files...');
    try {
      const result = await AlarmSoundModule.debugSoundFiles();
      console.log('📊 Sound files debug result:', JSON.stringify(result, null, 2));
      Alert.alert(
        'Sound Files Debug',
        `Total files: ${result.totalFilesCount}\n` + 
        `Sound files: ${result.soundFilesCount}\n` +
        `Found files: ${result.soundFiles?.join(', ') || 'None'}\n\n` +
        `radar.caf: ${result.specificSoundTests?.['radar.caf'] ? '✅' : '❌'}\n` +
        `beacon.caf: ${result.specificSoundTests?.['beacon.caf'] ? '✅' : '❌'}`
      );
    } catch (error) {
      console.error('❌ Error debugging sound files:', error);
      Alert.alert('Error', 'Failed to debug sound files. See logs for details.');
    }
  };

  const sendTestNotification = async () => {
    try {
      const permissions = await Notifications.requestPermissionsAsync();
      if (permissions.status !== 'granted') {
        Alert.alert("Permissions Required", "Notifications are not enabled.");
        return;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Bliss Alarm Test",
          body: "If you're seeing this, everything works.",
          categoryIdentifier: 'alarm',
          sound: 'default',
        },
        trigger: { 
          seconds: 3,
          type: 'timeInterval'
        } as Notifications.TimeIntervalTriggerInput,
      });

      console.log("✅ Notification scheduled with ID:", id);
      Alert.alert("Notification Sent", "It should appear in 3 seconds.");
    } catch (error) {
      console.error("❌ Failed to send test notification:", error);
      Alert.alert("Error", "Could not send test notification.");
    }
  };

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

  useEffect(() => {
    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Register category to avoid iOS suppressing content
    Notifications.setNotificationCategoryAsync('alarm', [
      {
        identifier: 'default',
        buttonTitle: 'Open',
        options: { opensAppToForeground: true },
      },
    ]);
  }, []);

  const navigateTo = (route: string) => {
    router.push(route);
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
            onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/About-Bliss-Alarm-26cb87683f3e460d9b2165399164a691?pvs=4')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="information-circle-outline" size={24} color="#5AC8FA" style={styles.settingIcon} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/Help-Frequently-Asked-Questions-FAQ-770d8543e82845499ea892d00b456b8c?pvs=25')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="help-circle-outline" size={24} color="#4CD964" style={styles.settingIcon} />
              <Text style={styles.settingText}>Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/Bliss-Alarm-Privacy-Policy-Support-18df35a984814023857f01d66b34afb5')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="shield-outline" size={24} color="#FF9500" style={styles.settingIcon} />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://blissalarm.com')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="globe-outline" size={24} color="#007AFF" style={styles.settingIcon} />
              <Text style={styles.settingText}>Website</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={sendTestNotification}
          >
            <View style={styles.settingContent}>
              <Ionicons name="notifications-outline" size={24} color="#FF2D55" style={styles.settingIcon} />
              <Text style={styles.settingText}>Send Test Notification</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
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
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    color: '#fff',
    fontSize: 17,
  },
}); 