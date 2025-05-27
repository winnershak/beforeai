import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, Alert, NativeModules } from 'react-native';
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
  
  const [blockRemovalsLeft, setBlockRemovalsLeft] = useState<number | null>(null);
  
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

  const handleGroupPlanPurchase = () => {
    // Use the href approach which is more reliable for cross-stack navigation
    router.push({
      pathname: "/settings/group-plan",
    });
  };

  // Add this new function to check and update block removal count
  const getBlockRemovalsLeft = async () => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
      
      const storedData = await AsyncStorage.getItem('blockRemovalData');
      const data = storedData ? JSON.parse(storedData) : { month: currentMonth, count: 0 };
      
      // Reset count if it's a new month
      if (data.month !== currentMonth) {
        data.month = currentMonth;
        data.count = 0;
        await AsyncStorage.setItem('blockRemovalData', JSON.stringify(data));
      }
      
      const removalsLeft = 3 - data.count;
      setBlockRemovalsLeft(removalsLeft);
      return removalsLeft;
    } catch (error) {
      console.error('Error checking block removals:', error);
      return 0;
    }
  };

  // Add this to useEffect to load initial count
  useEffect(() => {
    getBlockRemovalsLeft();
  }, []);

  // Modify the handleRemoveBlocks function
  const handleRemoveBlocks = async () => {
    try {
      const removalsLeft = await getBlockRemovalsLeft();
      
      if (removalsLeft <= 0) {
        Alert.alert(
          'Monthly Limit Reached',
          'You can only remove all blocks 3 times per month. Your limit will reset at the beginning of next month.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Remove All Blocks',
        `Are you sure you want to remove all app and website blocks? You have ${removalsLeft} out of 3 monthly removals left for this month.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              console.log('🔓 Removing all blocks...');
              
              // Update the removal count
              const now = new Date();
              const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
              const storedData = await AsyncStorage.getItem('blockRemovalData');
              const data = storedData ? JSON.parse(storedData) : { month: currentMonth, count: 0 };
              data.count += 1;
              await AsyncStorage.setItem('blockRemovalData', JSON.stringify(data));
              
              // Update schedules to inactive
              const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
              if (savedSchedules) {
                const schedules = JSON.parse(savedSchedules);
                const inactiveSchedules = schedules.map((s: any) => ({
                  ...s,
                  isActive: false
                }));
                await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(inactiveSchedules));
              }
              
              // Remove shields from native module
              if (Platform.OS === 'ios') {
                const { ScreenTimeBridge } = NativeModules;
                if (ScreenTimeBridge) {
                  await ScreenTimeBridge.removeAllShields();
                  console.log('🛡️ All shields removed');
                }
              }
              
              // Update the UI with remaining removals
              await getBlockRemovalsLeft();
              
              Alert.alert(
                'Blocks Removed',
                `All app and website blocks have been removed. You have ${removalsLeft - 1} out of 3 monthly removals left for this month.`,
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing blocks:', error);
      Alert.alert('Error', 'Failed to remove blocks. Please try again.');
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
              <Ionicons name="shield-outline" size={24} color="#FF3B30" style={styles.settingIcon} />
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Blocking</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleRemoveBlocks}
          >
            <View style={styles.settingContent}>
              <Ionicons name="shield-outline" size={24} color="#FF3B30" style={styles.settingIcon} />
              <Text style={[styles.settingText, styles.dangerText]}>
                Remove All Blocks {blockRemovalsLeft !== null && `(${blockRemovalsLeft}/3 monthly)`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Information</Text>
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              For reliable alarm functionality, please keep the app running in the background rather than swiping it away completely.
            </Text>
          </View>
        </View>
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
  warningBanner: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 12,
    marginTop: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    marginLeft: 16,
  },
  settingDescription: {
    color: '#999',
    fontSize: 14,
  },
  dangerItem: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  dangerText: {
    color: '#FF3B30',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 17,
  },
}); 