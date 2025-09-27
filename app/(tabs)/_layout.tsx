import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator, Alert, Modal, Pressable, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRootNavigationState } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Comment out potentially problematic imports
// import { HapticTab } from '@/components/HapticTab';
// import { IconSymbol } from '@/components/ui/IconSymbol';
// import TabBarBackground from '@/components/ui/TabBarBackground';
// import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import RevenueCatService from '../services/RevenueCatService';
import { registerBackgroundTask } from '../background-task';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const navigationState = useRootNavigationState();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    const checkPremiumAccess = async () => {
      try {
        if (!navigationState?.key) return;
        
        setIsLoading(true);
        
        const isPremium = await RevenueCatService.checkLocalSubscriptionStatus();
        const quizCompleted = await AsyncStorage.getItem('quizCompleted');
        
        if (quizCompleted !== 'true') {
          setTimeout(() => {
            router.replace('/quiz');
          }, 0);
          return;
        }
        
        setIsPremium(isPremium);
        setIsLoading(false);
      } catch (error) {
        console.error('Error in premium access check:', error);
        setIsLoading(false);
      }
    };

    checkPremiumAccess();
  }, [navigationState?.key]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <>
      <Tabs
        key="main-tabs"
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#1C1C1E',
            borderTopColor: '#38383A',
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTitleStyle: {
            color: '#fff',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Alarms',
            tabBarIcon: ({ color }) => Ionicons ? <Ionicons name="alarm" size={28} color={color} /> : null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="tutorial"
          options={{
            title: 'Secret',
            tabBarIcon: ({ color }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="book-outline" size={28} color={color} />
                {!isPremium && (
                  <Ionicons 
                    name="lock-closed" 
                    size={12} 
                    color="#FFD700" 
                    style={{ position: 'absolute', top: -5, right: -5 }} 
                  />
                )}
              </View>
            ),
            headerShown: false,
          }}
          listeners={{
            tabPress: (e) => {
              if (!isPremium) {
                // Prevent default navigation
                e.preventDefault();
                // Show custom modal instead of alert
                console.log('Secret tab pressed, showing modal');
                setShowPremiumModal(true);
              }
            }
          }}
        />
        <Tabs.Screen
          name="sounds"
          options={{
            title: 'Sounds',
            tabBarIcon: ({ color }) => Ionicons ? <Ionicons name="musical-notes" size={28} color={color} /> : null,
            headerShown: true,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => Ionicons ? <Ionicons name="settings" size={28} color={color} /> : null,
            headerShown: false,
          }}
        />
      </Tabs>

      {/* Modal moved outside of Tabs */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showPremiumModal}
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <Pressable 
          style={customModalStyles.overlay}
          onPress={() => setShowPremiumModal(false)}
        >
          <Pressable 
            style={customModalStyles.modal}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={customModalStyles.title}>Premium Feature</Text>
            <Text style={customModalStyles.message}>
              The Secret section is only available for premium users.
            </Text>
            
            <View style={customModalStyles.buttonContainer}>
              <Pressable 
                style={customModalStyles.button}
                onPress={() => {
                  console.log('Maybe Later pressed');
                  setShowPremiumModal(false);
                }}
              >
                <Text style={customModalStyles.normalText}>Maybe Later</Text>
              </Pressable>
              
              <Pressable 
                style={[customModalStyles.button, customModalStyles.primaryButton]}
                onPress={() => {
                  console.log('Upgrade pressed');
                  setShowPremiumModal(false);
                  router.push('/quiz/yes');
                }}
              >
                <Text style={customModalStyles.boldText}>Upgrade</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const customModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    width: 270,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#48484A',
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  primaryButton: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#48484A',
  },
  normalText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: 'normal',
  },
  boldText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',  // Semi-bold like iOS
  },
});
