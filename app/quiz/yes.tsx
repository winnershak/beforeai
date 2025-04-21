import React, { useEffect, useState, useRef } from 'react';
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
  ActivityIndicator,
  Linking,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from '../services/RevenueCatService';
import * as Notifications from 'expo-notifications';
import * as InAppPurchases from 'expo-in-app-purchases';
import * as Network from 'expo-network';
import * as Application from 'expo-application';

// Product IDs as simple constants - no capitalization to avoid confusion
const PRODUCT_MONTHLY = 'blissmonth';
const PRODUCT_YEARLY = 'blissyear';

const { width, height } = Dimensions.get('window');

// Updated user reviews without images - reordered to put the 4th review first
const userReviews = [
  {
    id: '4',
    rating: 5,
    text: 'Been using this for 5 months and it\'s gooood. My skin never looked better and I lost weight so much easier. WHY DID I WAIT SO LONG TO IMPROVE MY SLEEP?'
  },
  {
    id: '1',
    name: 'I had like 5 sleep apps!!! THIS ONE WORKS',
    rating: 5,
    text: 'This app changed my life - is will help people who have bad sleep more than any other app. The features are game changing and it will help you become a more productive person! 10/10'
  },
  {
    id: '2',
    name: 'Best subscription I pay for',
    rating: 5,
    text: 'This is arguably the best subscription I pay for. Having ADHD makes waking up and going to bed the hardest part of my day. I\'m a little annoyed to be sure, but that\'s the point of an app, annoying so that you get some sleep. I recommend Bliss Alarm to anyone to anyone who values sleep especially to any of people who are neurodivergent like me.'
  },
  {
    id: '3',
    rating: 5,
    text: 'Supa hottttttt 🔥🔥🔥🔥🔥'
  },
  {
    id: '5',
    rating: 5,
    text: 'I\'ve struggled with sleep for years, and the Bliss Alarm app has truly been a game-changer. This app significantly improved my rest, and I wake up feeling refreshed and energized. Highly recommend  to anyone looking to improve their sleep quality!'
  }
];

const debugIAP = async () => {
  console.log('=== IAP DEBUG START ===');
  console.log('Device ID:', await Application.getIosIdForVendorAsync());
  console.log('Bundle ID:', await Application.applicationId);
  // Log StoreKit connection
  try {
    await InAppPurchases.connectAsync();
    console.log('StoreKit connection: SUCCESS');
    try {
      console.log('Getting product IDs:', {PRODUCT_MONTHLY, PRODUCT_YEARLY});
      const products = await InAppPurchases.getProductsAsync([PRODUCT_MONTHLY, PRODUCT_YEARLY]);
      console.log('PRODUCTS RESPONSE:', JSON.stringify(products, null, 2));
    } catch (e) {
      console.log('Product fetch failed:', e);
    }
  } catch (e) {
    console.log('StoreKit connection failed:', e);
  }
  console.log('=== IAP DEBUG END ===');
};

export default function YesScreen() {
  const [personName, setPersonName] = useState("Friend");
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const hasStartedPurchase = useRef(false);
  
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
        console.log('Starting IAP initialization...');
        
        // Always disconnect first to ensure a clean state
        try {
          await InAppPurchases.disconnectAsync();
          console.log('Disconnected from App Store (cleanup)');
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
        
        // Then connect explicitly
        try {
          await InAppPurchases.connectAsync();
          console.log('Successfully connected to App Store');
        } catch (connectError) {
          console.error('Failed to connect to App Store:', connectError);
          // Show error to user
          Alert.alert(
            "Store Connection Error",
            "Unable to connect to the App Store. Please restart the app and try again."
          );
          return;
        }
        
        // First test a direct connection to the App Store
        try {
          // Test retrieving products directly
          console.log('ATTEMPTING TO FETCH FROM APP STORE WITH EXACTLY THESE IDs:', 
            JSON.stringify({PRODUCT_MONTHLY, PRODUCT_YEARLY}));
          
          const products = await InAppPurchases.getProductsAsync([
            PRODUCT_MONTHLY, PRODUCT_YEARLY
          ]);
          console.log('DIRECT IAP TEST RESULT:', JSON.stringify(products, null, 2));
        } catch (e) {
          console.error('Failed to get products after connection:', e);
        }
        
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
    // Default values
    const defaults = {
      monthly: { price: '$12.99' },
      yearly: { price: '$49.99' }
    };
    
    // Find by product ID directly
    const productId = packageType === 'monthly' ? PRODUCT_MONTHLY : PRODUCT_YEARLY;
    
    // Check if packages is an array
    if (!Array.isArray(packages)) {
      return defaults[packageType as keyof typeof defaults];
    }
    
    // Find the package
    const pkg = packages.find(p => p.identifier === productId);
    
    if (!pkg) {
      return defaults[packageType as keyof typeof defaults];
    }
    
    return {
      price: pkg.product.priceString
    };
  };

  // Function to handle subscription
  const handleSubscription = async () => {
    if (hasStartedPurchase.current) return;
    hasStartedPurchase.current = true;

    try {
      setLoading(true);
      
      // Direct IAP purchase - the most reliable method  
      try {
        const productId = selectedPlan === 'yearly' ? PRODUCT_YEARLY : PRODUCT_MONTHLY;
        
        // Get products directly from Apple
        const products = await InAppPurchases.getProductsAsync([productId]);
        
        if (products.results && products.results.length > 0) {
          // Product exists, try purchasing directly
          console.log('Attempting direct purchase...');
          
          // Set up purchase listener
          InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
            if (responseCode === InAppPurchases.IAPResponseCode.OK) {
              console.log('Direct purchase successful!');
              // Verify we have valid results before proceeding
              if (results && results.length > 0) {
                const purchase = results[0];
                // Verify this is one of our subscription products
                if (purchase.productId === PRODUCT_MONTHLY || purchase.productId === PRODUCT_YEARLY) {
                  // Simple direct approach - no promises or nested callbacks
                  AsyncStorage.setItem('isPremium', 'true');
                  AsyncStorage.setItem('quizCompleted', 'true');
                  console.log('Purchase successful, navigating to alarms...');
                  // Navigate after a small delay to ensure storage is updated
                  setTimeout(() => {
                    router.replace('/(tabs)');
                  }, 300);
                } else {
                  console.log('Invalid product purchased:', purchase.productId);
                  Alert.alert('Purchase Error', 'Invalid product purchased. Please try again.');
                  setLoading(false);
                }
              } else {
                console.log('No purchase results returned');
                setLoading(false);
              }
            } else {
              console.log('Purchase failed with code:', responseCode);
              Alert.alert('Purchase Failed', 'Please try again later.');
              setLoading(false);
            }
          });
          
          // Purchase the product
          await InAppPurchases.purchaseItemAsync(productId);
          
          // Add backup timer to check purchase status and navigate
          const purchaseCheckTimer = setTimeout(async () => {
            console.log('Backup purchase check timer fired');
            console.log('Checking subscription status directly...');
            try {
              const isPremium = await RevenueCatService.isSubscribed();
              console.log('RevenueCat subscription check result:', isPremium);
              
              if (isPremium) {
                console.log('Purchase was successful, navigating...');
                await AsyncStorage.setItem('isPremium', 'true');
                await AsyncStorage.setItem('quizCompleted', 'true');
                router.replace('/(tabs)');
              } else {
                console.log('No subscription detected in backup check');
                setLoading(false);
                Alert.alert("Subscription Required", "Please complete your purchase to continue.");
              }
            } catch (error) {
              console.error('Error in subscription check:', error);
              setLoading(false);
            }
          }, 2000);
          
          return; // Exit early if direct purchase is initiated
        }
      } catch (directError) {
        console.error('Direct purchase attempt failed:', directError);
      }
      
      // Add detailed debugging
      console.log('Product IDs we are looking for:', PRODUCT_MONTHLY, PRODUCT_YEARLY);
      
      // Force load products directly
      try {
        const rawProducts = await InAppPurchases.getProductsAsync([
          PRODUCT_MONTHLY, PRODUCT_YEARLY
        ]);
        console.log('DIRECT PRODUCT TEST:', rawProducts);
      } catch (productError) {
        console.error('Failed to get products:', productError);
      }
      
      // If no packages loaded, try loading them again
      if (!Array.isArray(packages) || packages.length === 0) {
        const availablePackages = await RevenueCatService.getSubscriptionPackages();
        setPackages(availablePackages);
        console.log('Available packages:', JSON.stringify(availablePackages, null, 2));
        
        if (availablePackages.length === 0) {
          Alert.alert("Error", "Unable to load subscription options. Please try again later.");
          return;
        }
      }
      
      // Find the selected package by product ID directly
      const productId = selectedPlan === 'yearly' ? PRODUCT_YEARLY : PRODUCT_MONTHLY;
      console.log(`Looking for product ID: ${productId} in packages:`, JSON.stringify(packages, null, 2));

      // Direct purchase approach - skip package finding
      try {
        console.log('Using direct purchase approach with product ID:', productId);
        const success = await RevenueCatService.purchaseProduct(productId);
        
        if (success) {
          // Save both premium status and subscription type
          await AsyncStorage.setItem('quizCompleted', 'true');
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('subscriptionType', selectedPlan);
          
          console.log(`Subscription successful: ${selectedPlan}`);
          
          // Request notification permissions
          await requestNotificationPermissions();
          
          // Navigate immediately, then show the alert
          router.replace('/(tabs)');
          
          // Show success alert after navigation
          setTimeout(() => {
            Alert.alert(
              "Subscription Successful", 
              `Thank you for subscribing to the ${selectedPlan} plan!`
            );
          }, 500);
        } else {
          Alert.alert("Subscription Failed", "There was an issue with your subscription. Please try again.");
        }
      } catch (purchaseError) {
        console.error('Error during direct purchase:', purchaseError);
        Alert.alert("Purchase Error", "There was an error processing your purchase. Please try again.");
      }

      // At the end of the function, before navigation:
      const isSubscribed = await RevenueCatService.isSubscribed();
      if (isSubscribed) {
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        router.replace('/(tabs)');
      } else {
        Alert.alert("Still Waiting", "We couldn't confirm your subscription yet. Please wait or try again.");
      }
    } catch (error) {
      console.error('Error during subscription:', error);
      Alert.alert("Error", `An unexpected error occurred: ${(error as Error).message || 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        hasStartedPurchase.current = false;
      }, 3000); // cooldown
      setLoading(false);
    }
  };

  // Function to properly restore purchases
  const handleRestore = async () => {
    try {
      setLoading(true);
      console.log('Attempting to restore purchases...');
      
      // Use the EXISTING restorePurchases method
      const restored = await RevenueCatService.restorePurchases();
      
      if (restored) {
        console.log('Subscription successfully restored!');
        
        // Get subscription details to verify it's active
        const details = await RevenueCatService.getSubscriptionDetails();
        
        // Check that details are valid and subscription is active
        if (details && details.expirationDate > new Date()) {
          // If valid, mark as premium
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('quizCompleted', 'true');
          
          Alert.alert(
            "Subscription Restored", 
            `Your subscription has been restored.`,
            [{ text: "Continue", onPress: () => router.push('/(tabs)') }]
          );
        } else {
          // Subscription exists but might be expired
          Alert.alert("Expired Subscription", "Your previous subscription appears to have expired. Please purchase a new subscription.");
        }
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

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(true);
      
      // Direct purchase approach - no package finding
      const purchased = await RevenueCatService.purchaseProduct(packageId);
      
      if (purchased) {
        // Mark quiz as completed
        await AsyncStorage.setItem('quizCompleted', 'true');
        await AsyncStorage.setItem('isPremium', 'true');
        
        // Store subscription type based on packageId
        if (packageId === 'blissmonth') {
          await AsyncStorage.setItem('subscriptionType', 'monthly');
          console.log('Monthly subscription stored');
        } else if (packageId === 'blissyear') {
          await AsyncStorage.setItem('subscriptionType', 'yearly');
          console.log('Yearly subscription stored');
        }
        
        console.log('Purchase successful, redirecting to app block');
        
        // Force navigation with a slight delay to ensure state is updated
        setTimeout(() => {
          console.log('Executing delayed navigation to app block');
          router.replace('/(tabs)/appblock');
        }, 500);
      } else {
        console.log('Purchase failed or was cancelled');
        Alert.alert("Purchase Failed", "Your purchase could not be completed. Please try again.");
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert("Purchase Error", "There was an error processing your purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        console.log('NETWORK STATE:', networkState);
        
        if (!networkState.isConnected || !networkState.isInternetReachable) {
          Alert.alert(
            "Internet Connection Error",
            "Please check your internet connection and try again."
          );
        }
      } catch (e) {
        console.error('Network check error:', e);
      }
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    debugIAP();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground 
        source={require('../../assets/images/cute.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                <View style={styles.messageContainer}>
                  <Text style={styles.welcomeText}>
                    <Text style={styles.personName}>{personName}, </Text>
                  </Text>
                  <Text style={styles.guaranteeBold}>
                    We guarantee you better sleep in a month or get refunded.
                  </Text>
                </View>
                
                {/* Expert Reviews Carousel */}
                <View style={styles.reviewsContainer}>
                  <ScrollView 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.reviewsScrollContent}
                  >
                    <View style={styles.reviewCard}>
                      <Text style={styles.reviewSource}>Andrew Huberman, Stanford Neuroscientist</Text>
                      <Text style={styles.reviewQuote}>
                        "Getting quality sleep is the single most powerful action you can take to enhance your mental health, physical vitality, and overall quality of life."
                      </Text>
                    </View>
                    
                    <View style={styles.reviewCard}>
                      <Text style={styles.reviewSource}>Harvard Medical School</Text>
                      <Text style={styles.reviewQuote}>
                        "Sleeping consistently for at least 7 hours per night can add up to 5 years to your lifespan."
                      </Text>
                    </View>
                    
                    <View style={styles.reviewCard}>
                      <Text style={styles.reviewSource}>University of Chicago</Text>
                      <Text style={styles.reviewQuote}>
                        "Improving your sleep quality directly contributes to healthier metabolism, aiding sustainable fat loss efforts by 50%."
                      </Text>
                    </View>
                  </ScrollView>
                </View>
                
                <View style={styles.spacer} />
                
                {/* Subscription options */}
                <View style={styles.subscriptionContainer}>
                  {/* Monthly option */}
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      selectedPlan === 'monthly' ? styles.selectedPlan : null,
                    ]}
                    onPress={() => setSelectedPlan('monthly')}
                  >
                    <View style={styles.planContent}>
                      <View style={styles.planLeftContent}>
                        <Text style={styles.planTitle}>Monthly</Text>
                        <Text style={styles.planPrice}>{getPackageDetails('monthly').price}</Text>
                      </View>
                      <View style={styles.planRightContent}>
                        <Text style={styles.planDaily}>$0.43</Text>
                        <Text style={styles.perDayText}>per day</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Yearly option with popular tag */}
                  <View style={styles.yearlyContainer}>
                    <View style={styles.popularTagContainer}>
                      <Text style={styles.popularTagText}>Most popular</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.planOption,
                        styles.yearlyOption,
                        selectedPlan === 'yearly' ? styles.selectedPlan : null,
                      ]}
                      onPress={() => setSelectedPlan('yearly')}
                    >
                      <View style={styles.planContent}>
                        <View style={styles.planLeftContent}>
                          <Text style={styles.planTitle}>Yearly</Text>
                          <Text style={styles.planPrice}>{getPackageDetails('yearly').price}</Text>
                          <Text style={styles.savingsText}>Save 50%</Text>
                        </View>
                        <View style={styles.planRightContent}>
                          <Text style={styles.planDaily}>$0.14</Text>
                          <Text style={styles.perDayText}>per day</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Add user reviews section below pricing options */}
                <View style={styles.userReviewsContainer}>
                  <Text style={styles.userReviewsTitle}>What our users say</Text>
                  {userReviews.map((review) => (
                    <View key={review.id} style={styles.userReviewCard}>
                      <View style={styles.userReviewHeader}>
                        {review.name && (
                          <Text style={styles.userName}>{review.name}</Text>
                        )}
                        <View style={styles.ratingContainer}>
                          {[...Array(review.rating)].map((_, i) => (
                            <Ionicons key={i} name="star" size={16} color="#FFD700" />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.userReviewText}>{review.text}</Text>
                    </View>
                  ))}
                </View>
                
                {/* Add extra space at the bottom for the sticky button */}
                <View style={styles.bottomPadding} />
              </View>
            </ScrollView>
            
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
                  <Text style={styles.buttonText}>Unlock Access</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.restoreButton, { marginTop: 8, marginBottom: 4 }]}
                onPress={handleRestore}
                disabled={loading}
              >
                <Text style={styles.restoreText}>Restore Purchases</Text>
              </TouchableOpacity>
              
              <View style={styles.guaranteesContainer}>
                <View style={styles.securityContainer}>
                  <Text style={styles.securityText}>
                    🛡️ Cancel Anytime. 24/7 support.
                  </Text>
                </View>
                <Text style={styles.termsText}>
                  <Text onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                    Terms of Use
                  </Text>
                  {' • '}
                  <Text onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/Bliss-Alarm-Privacy-Policy-Support-18df35a984814023857f01d66b34afb5')}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
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
    backgroundColor: '#000', // Changed back to solid black background
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 150, // Extra space for the sticky button
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  messageContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
  },
  personName: {
    fontWeight: 'bold',
  },
  guarantee: {
    fontWeight: 'normal',
  },
  spacer: {
    height: 40,
  },
  subscriptionContainer: {
    marginVertical: 25,
    width: '100%',
  },
  planOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    width: '100%',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  planContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLeftContent: {
    alignItems: 'flex-start',
  },
  planRightContent: {
    alignItems: 'flex-end',
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planPrice: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 5,
  },
  planDaily: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  perDayText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  savingsText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bottomPadding: {
    height: 100, // Extra padding at the bottom
  },
  stickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 30,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
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
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  guaranteesContainer: {
    marginTop: 2,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  reviewsContainer: {
    marginVertical: 20,
    width: '100%',
  },
  reviewsScrollContent: {
    paddingHorizontal: 10,
  },
  reviewCard: {
    width: Dimensions.get('window').width - 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reviewQuote: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 10,
  },
  reviewSource: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 8,
  },
  popularTag: {
    position: 'absolute',
    top: -15,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  popularTagText: {
    backgroundColor: '#FF9500',
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'visible',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  featuredQuoteContainer: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  featuredQuoteSource: {
    color: '#FF9500',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  featuredQuote: {
    color: '#FFFFFF',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  userReviewsContainer: {
    marginTop: 30,
  },
  userReviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  userReviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
    flex: 1,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  userReviewText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  guaranteeBold: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 20,
  },
  yearlyContainer: {
    position: 'relative',
    paddingTop: 10,
    marginBottom: 20,
  },
  yearlyOption: {
    marginTop: 0,
    marginBottom: 0,
  },
  popularTagContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  selectedPlan: {
    backgroundColor: 'rgba(255, 149, 0, 0.25)',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  securityContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  securityText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
}); 