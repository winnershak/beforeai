import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity, 
  Dimensions,
  Image,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function YesScreen() {
  const [personName, setPersonName] = useState("Friend");
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'yearly'
  
  // Fetch the person's name from AsyncStorage using the correct key
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Get name using the exact key from userInfo.tsx
        const userName = await AsyncStorage.getItem('user_name');
        if (userName) {
          setPersonName(userName);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };
    
    fetchUserName();
  }, []);

  // Preload the background image
  useEffect(() => {
    const preloadImage = async () => {
      try {
        const image = require('../../assets/images/cute.webp');
        const uri = Image.resolveAssetSource(image).uri;
        await CacheManager.get(uri, { headers: {} }).getPath();
      } catch (error) {
        console.error('Error preloading image:', error);
      }
    };
    
    preloadImage();
  }, []);

  // Function to handle subscription
  const handleSubscription = () => {
    if (__DEV__) {
      // In development, show a mock subscription flow
      Alert.alert(
        "Development Mode",
        `This is a development build. In production, this would open the App Store subscription dialog for the ${selectedPlan} plan. Would you like to simulate a successful subscription?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Simulate Success",
            onPress: () => {
              Alert.alert("Success", `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} subscription processed successfully!`, [
                {
                  text: "OK",
                  onPress: () => router.push('/(tabs)')
                }
              ]);
            }
          }
        ]
      );
    } else {
      // In production, this would trigger the actual in-app purchase
      // You would use a library like react-native-iap or expo-in-app-purchases
      router.push('/(tabs)');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground 
        source={require('../../assets/images/cute.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.messageContainer}>
              <Text style={styles.personName}>{personName},</Text>
              <Text style={styles.title}>we have made you a custom alarms.</Text>
              <Text style={styles.guarantee}>
                We guarantee you get better sleep in a month or get refunded.
              </Text>
            </View>
            
            <View style={styles.spacer} />
            
            {/* Subscription options */}
            <View style={styles.subscriptionContainer}>
              <TouchableOpacity 
                style={[
                  styles.subscriptionOption, 
                  selectedPlan === 'monthly' && styles.selectedOption
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={styles.subscriptionTitle}>Monthly</Text>
                <Text style={styles.subscriptionPrice}>$12.99/month</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.subscriptionOption,
                  selectedPlan === 'yearly' && styles.selectedOption
                ]}
                onPress={() => setSelectedPlan('yearly')}
              >
                <Text style={styles.subscriptionTitle}>Yearly</Text>
                <Text style={styles.subscriptionPrice}>$4.99/month</Text>
                <Text style={styles.savingsText}>Save 61%</Text>
              </TouchableOpacity>
            </View>
            
            {/* Sticky button and guarantees */}
            <View style={styles.stickyContainer}>
              <TouchableOpacity 
                style={styles.button}
                onPress={handleSubscription}
              >
                <Text style={styles.buttonText}>Subscribe Now</Text>
              </TouchableOpacity>
              
              <View style={styles.guaranteesContainer}>
                <Text style={styles.guaranteeText}>
                  🔄 Cancel anytime
                </Text>
                <Text style={styles.guaranteeText}>
                  💰 Money back guarantee
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
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
  container: {
    flex: 1,
    backgroundColor: '#000', // Changed to black background
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  messageContainer: {
    alignItems: 'center',
  },
  personName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  guarantee: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  spacer: {
    flex: 1,
  },
  subscriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  subscriptionOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 149, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  subscriptionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subscriptionPrice: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  savingsText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  stickyContainer: {
    width: '100%',
    paddingBottom: 30,
  },
  button: {
    backgroundColor: '#FF9500', // Orange/sun color
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  guaranteesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  guaranteeText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 