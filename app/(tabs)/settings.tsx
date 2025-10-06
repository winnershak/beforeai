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
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import appleAuth from '@invertase/react-native-apple-authentication';
import firebase from '@react-native-firebase/app';

export default function SettingsScreen() {
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    expirationDate?: Date;
    latestPurchaseDate?: Date;
    productIdentifier?: string;
    isYearly: boolean;
  } | null>(null);
  
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null); // Changed to any as FirebaseAuthTypes is removed
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [earlyBirdTarget, setEarlyBirdTarget] = useState(8); // Default to 8 AM
  
  // Check Firebase auth state
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const unsubscribe = auth().onAuthStateChanged((user) => {
          console.log('🔥 Auth state changed:', user?.email || 'No user');
          setFirebaseUser(user);
        });
        return () => unsubscribe();
      } catch (error) {
        console.log('Firebase auth setup failed:', error);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

  // Firebase Login Handler
  const handleFirebaseLogin = async () => {
    try {
      // await testFirebaseConnection(); // This line is removed as testFirebaseConnection is removed
      // const result = await signInWithGoogle(); // This line is removed as signInWithGoogle is removed
      
      Alert.alert(
        'Welcome!', 
        `Successfully signed in as ${firebaseUser?.displayName || firebaseUser?.email || 'Bliss User'}`,
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      Alert.alert(
        'Sign-In Failed', 
        'Unable to sign in right now. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Firebase Logout Handler
  const handleFirebaseLogout = async () => {
    try {
      // await signOut(); // This line is removed as signOut is removed
      Alert.alert('Signed Out', 'Successfully signed out of Firebase');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
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

  const handleTestWakeUp = async () => {
    try {
      // await addTestWakeUp(); // This line is removed as addTestWakeUp is removed
      Alert.alert('Success!', 'Test wake-up added to Firebase! Check your Feed tab.');
    } catch (error) {
      Alert.alert('Error', `Failed to add test wake-up: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const handleAddTestWakeUps = async () => {
    try {
      // const user = getCurrentUser(); // This line is removed as getCurrentUser is removed
      // if (!user) {
      //   Alert.alert('Error', 'Please sign in first');
      //   return;
      // }

      // Add 3 test wake-ups with just the essentials
      const testData = [
        { time: '07:30', date: '2025-06-08', message: 'Feeling great this morning! 🌅' },
        { time: '06:45', date: '2025-06-07', message: 'Early bird today!' },
        { time: '08:15', date: '2025-06-06', message: '' }, // No message
      ];

      for (const test of testData) {
        // await saveWakeupToFirestore({ // This line is removed as saveWakeupToFirestore is removed
        //   wakeUpTime: test.time,
        //   date: test.date,
        //   message: test.message,
        // });
      }

      Alert.alert('Success!', 'Added 3 test wake-ups to your feed!');
    } catch (error) {
      Alert.alert('Error', `Failed to add test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadUserProfile = async () => {
    try {
      // const user = getCurrentUser(); // This line is removed as getCurrentUser is removed
      // if (user) {
      //   const profile = await getUserProfile(user.uid);
      //   setUserProfile(profile);
      // }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleEditProfile = () => {
    router.push('/settings/profile');
  };

  const signInWithApple = async () => {
    try {
      console.log('🍎 Starting Apple Sign In...');
      
      // Request Apple authentication
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Get credential state
      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const { identityToken, nonce, fullName } = appleAuthRequestResponse;
        const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
        
        const userCredential = await auth().signInWithCredential(appleCredential);
        
        // Update user profile with full name if provided
        if (fullName?.givenName || fullName?.familyName) {
          const displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim();
          await userCredential.user.updateProfile({ displayName });
        }
        
        setFirebaseUser(userCredential.user);
        
        console.log('✅ Apple Sign In successful!');
        Alert.alert('Welcome!', 'Successfully signed in with Apple!');
      }
    } catch (error) {
      console.error('❌ Apple Sign In error:', error);
      Alert.alert('Error', 'Sign in failed. Please try again.');
    }
  };

  const signOut = async () => {
    try {
      await auth().signOut();
      setFirebaseUser(null);
      console.log('✅ User signed out');
      Alert.alert('Signed Out', 'You have been signed out successfully.');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      Alert.alert('Error', 'Could not sign out. Please try again.');
    }
  };

  const updateEarlyBirdTarget = async (hour: number) => {
    try {
      await AsyncStorage.setItem('earlyBirdTarget', hour.toString());
      setEarlyBirdTarget(hour);
      console.log(`Early bird target set to: ${hour}:00`);
    } catch (error) {
      console.error('Error saving early bird target:', error);
    }
  };

  // Load early bird target
  useEffect(() => {
    const loadEarlyBirdTarget = async () => {
      try {
        const saved = await AsyncStorage.getItem('earlyBirdTarget');
        if (saved) {
          setEarlyBirdTarget(parseInt(saved));
        }
      } catch (error) {
        console.error('Error loading early bird target:', error);
      }
    };
    loadEarlyBirdTarget();
  }, []);

  const handleResetStreak = () => {
    Alert.alert(
      'Reset Streak?',
      'This will permanently reset your early bird streak to 0. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('earlyWakeUpStreak');
              Alert.alert('Success', 'Your streak has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset streak.');
            }
          }
        }
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data including wake-up history, streaks, and journal entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Starting account deletion...');
              const user = auth().currentUser;
              
              if (!user) {
                Alert.alert('Error', 'No user signed in.');
                return;
              }

              // Delete user data from Firestore
              try {
                await firestore().collection('users').doc(user.uid).delete();
                console.log('✅ User data deleted from Firestore');
              } catch (firestoreError) {
                console.log('⚠️ Firestore deletion failed (user may not have data):', firestoreError);
              }

              // Clear local data
              try {
                await AsyncStorage.multiRemove([
                  'alarms',
                  'wakeupHistory', 
                  'journalEntries',
                  'earlyWakeUpStreak',
                  'earlyBirdTarget'
                ]);
                console.log('✅ Local data cleared');
              } catch (localError) {
                console.log('⚠️ Local data clearing failed:', localError);
              }

              // Delete the Firebase Auth account
              await user.delete();
              
              setFirebaseUser(null);
              console.log('✅ Account deleted successfully');
              
              Alert.alert(
                'Account Deleted', 
                'Your account has been permanently deleted. Thank you for using Bliss Alarm.',
                [{ text: 'OK', onPress: () => router.replace('/quiz') }]
              );
              
            } catch (error: any) {
              console.error('❌ Account deletion error:', error);
              
              if ((error as any).code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Re-authentication Required',
                  'For security, please sign out and sign back in, then try deleting your account again.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
              }
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Early Bird Streak Section - AT THE TOP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Early Bird Streak</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="sunny-outline" size={24} color="#FFD700" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingText}>Wake-up Target</Text>
                <Text style={styles.settingSubtext}>Before {earlyBirdTarget}:00 AM</Text>
              </View>
            </View>
            <View style={styles.targetControls}>
              <TouchableOpacity 
                style={styles.targetButton}
                onPress={() => earlyBirdTarget > 5 && updateEarlyBirdTarget(earlyBirdTarget - 1)}
              >
                <Text style={styles.targetButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.targetTime}>{earlyBirdTarget}:00</Text>
              <TouchableOpacity 
                style={styles.targetButton}
                onPress={() => earlyBirdTarget < 12 && updateEarlyBirdTarget(earlyBirdTarget + 1)}
              >
                <Text style={styles.targetButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

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

        {/* Sign In Section - for users who aren't signed in */}
        {!firebaseUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={signInWithApple}
            >
              <View style={styles.settingContent}>
                <Ionicons name="logo-apple" size={24} color="#000" style={[styles.settingIcon, { backgroundColor: '#fff', borderRadius: 12, padding: 2 }]} />
                <Text style={styles.settingText}>Sign in with Apple</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Account Management Section - for users who ARE signed in */}
        {firebaseUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Management</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/settings/profile')}
            >
              <View style={styles.settingContent}>
                <Ionicons name="person-outline" size={24} color="#007AFF" style={styles.settingIcon} />
                <Text style={styles.settingText}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={signOut}
            >
              <View style={styles.settingContent}>
                <Ionicons name="log-out-outline" size={24} color="#FF9500" style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: '#FF9500' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, styles.dangerItem]}
              onPress={deleteAccount}
            >
              <View style={styles.settingContent}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" style={styles.settingIcon} />
                <Text style={[styles.settingText, styles.dangerText]}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

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
    paddingHorizontal: 20, // ← THIS IS MAKING BUTTONS WIDE
  },
  sectionTitle: {
    color: '#999',  // ← Change from '#fff' to '#999'
    fontSize: 14,   // ← Change from 20 to 14
    textTransform: 'uppercase',  // ← Add this
    letterSpacing: 1,  // ← Add this
    marginBottom: 10,  // ← Change from 16 to 10
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
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    color: '#fff',
    fontSize: 17,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  userSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
  },
  settingSubtext: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  targetControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetButton: {
    backgroundColor: '#333',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  targetTime: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  streakStoryText: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fullScreenStory: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  brandingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
}); 