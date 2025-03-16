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
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from '../services/RevenueCatService';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

export default function YesScreen() {
  const [personName, setPersonName] = useState("Friend");
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  
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
    
    // Initialize the RevenueCat service
    const initializeRevenueCat = async () => {
      try {
        await RevenueCatService.initialize();
        const availablePackages = await RevenueCatService.getSubscriptionPackages();
        setPackages(availablePackages);
      } catch (error) {
        console.error('Error initializing RevenueCat:', error);
      }
    };
    
    initializeRevenueCat();
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

  // Add this function to format the prices
  const getPackageDetails = (packageType: string) => {
    // Find by product ID directly
    const productId = packageType === 'monthly' ? 'blissmonth' : 'blissyear';
    const pkg = packages.find(p => p.identifier === productId);
    
    if (!pkg) {
      console.log(`Package not found for ${productId}. Available packages:`, JSON.stringify(packages, null, 2));
      return { 
        price: packageType === 'monthly' ? '$12.99' : '$79.99' 
      };
    }
    
    return {
      price: pkg.product.priceString
    };
  };

  // Function to handle subscription
  const handleSubscription = async () => {
    try {
      setLoading(true);
      
      // If no packages loaded, try loading them again
      if (packages.length === 0) {
        const availablePackages = await RevenueCatService.getSubscriptionPackages();
        setPackages(availablePackages);
        console.log('Available packages:', JSON.stringify(availablePackages, null, 2));
        
        if (availablePackages.length === 0) {
          Alert.alert("Error", "Unable to load subscription options. Please try again later.");
          return;
        }
      }
      
      // Find the selected package by product ID directly
      const productId = selectedPlan === 'yearly' ? 'blissyear' : 'blissmonth';
      console.log(`Looking for product ID: ${productId} in packages:`, JSON.stringify(packages, null, 2));
      
      const selectedPackage = packages.find(pkg => pkg.identifier === productId);
      
      if (!selectedPackage) {
        Alert.alert("Error", `Selected subscription package (${productId}) not available.`);
        return;
      }
      
      // Purchase the package
      const success = await RevenueCatService.purchasePackage(selectedPackage);
      
      if (success) {
        // Mark quiz as completed
        await AsyncStorage.setItem('quizCompleted', 'true');
        await AsyncStorage.setItem('isPremium', 'true');
        
        // Request notification permissions
        await requestNotificationPermissions();
        
        Alert.alert(
          "Subscription Successful", 
          `Thank you for subscribing to the ${selectedPlan} plan!`,
          [
            {
              text: "Continue",
              onPress: () => router.push('/(tabs)')
            }
          ]
        );
      } else {
        Alert.alert("Subscription Failed", "There was an issue with your subscription. Please try again.");
      }
    } catch (error) {
      console.error('Error during subscription:', error);
      Alert.alert("Error", `An unexpected error occurred: ${(error as Error).message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to restore purchases
  const handleRestore = async () => {
    try {
      setLoading(true);
      const restored = await RevenueCatService.restorePurchases();
      
      if (restored) {
        const details = await RevenueCatService.getSubscriptionDetails();
        Alert.alert(
          "Subscription Restored", 
          `Your subscription has been restored.`,
          [
            {
              text: "Continue",
              onPress: () => router.push('/(tabs)')
            }
          ]
        );
      } else {
        Alert.alert("No Active Subscription", "We couldn't find any active subscriptions to restore.");
      }
    } catch (error) {
      console.error('Error restoring subscription:', error);
      Alert.alert("Error", "An error occurred while restoring your subscription.");
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status === 'granted') {
          console.log('Notification permissions granted');
          await AsyncStorage.setItem('notificationPermissionGranted', 'true');
        } else {
          console.log('Notification permissions denied');
        }
      } else {
        await AsyncStorage.setItem('notificationPermissionGranted', 'true');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
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
                disabled={loading}
              >
                <Text style={styles.subscriptionTitle}>Monthly</Text>
                <Text style={styles.subscriptionPrice}>{getPackageDetails('monthly').price}/month</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.subscriptionOption,
                  selectedPlan === 'yearly' && styles.selectedOption
                ]}
                onPress={() => setSelectedPlan('yearly')}
                disabled={loading}
              >
                <Text style={styles.subscriptionTitle}>Yearly</Text>
                <Text style={styles.subscriptionPrice}>{getPackageDetails('yearly').price}/year</Text>
                <Text style={styles.savingsText}>Save 50%</Text>
              </TouchableOpacity>
            </View>
            
            {/* Sticky button and guarantees */}
            <View style={styles.stickyContainer}>
              <TouchableOpacity 
                style={styles.button}
                onPress={handleSubscription}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Subscribe Now</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={loading}
              >
                <Text style={styles.restoreText}>Restore Purchases</Text>
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
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  restoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    textDecorationLine: 'underline',
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