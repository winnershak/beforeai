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
import * as Network from 'expo-network';
import * as Application from 'expo-application';

// Product IDs that match what's in RevenueCat and App Store
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

export default function YesScreen() {
  const [personName, setPersonName] = useState("Friend");
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const hasStartedPurchase = useRef(false);
  
  // Fetch the person's name from AsyncStorage
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userName = await AsyncStorage.getItem('user_name');
        if (userName) {
          setPersonName(userName);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };
    
    fetchUserName();
    
    // Initialize RevenueCat only once on component mount
    const initializeRevenueCat = async () => {
      try {
        console.log('Initializing RevenueCat...');
        await RevenueCatService.initialize();
        
        // Check if user already has premium
        const isPremium = await RevenueCatService.isSubscribed();
        console.log('User premium status:', isPremium);
        
        if (isPremium) {
          console.log('User already has premium subscription');
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('quizCompleted', 'true');
          
          // Navigate to index if already premium
          router.replace('/');
          return;
        }
        
        // Only fetch packages if not premium
        const packages = await RevenueCatService.getSubscriptionPackages();
        console.log('RevenueCat packages available:', packages.length);
        setPackages(packages);
      } catch (error) {
        console.error('Error initializing RevenueCat:', error);
      }
    };
    
    initializeRevenueCat();
    
    // Check network connectivity
    const checkConnection = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        console.log('Network state:', networkState.isConnected ? 'Connected' : 'Disconnected');
        
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

  // Simplified subscription handler using only RevenueCat
  const handleSubscription = async () => {
    if (hasStartedPurchase.current || loading) return;
    hasStartedPurchase.current = true;
    setLoading(true);

    try {
      const productId = selectedPlan === 'yearly' ? PRODUCT_YEARLY : PRODUCT_MONTHLY;
      console.log(`Starting purchase for ${productId}...`);
      
      const success = await RevenueCatService.purchaseProduct(productId);

      if (success) {
        console.log('Purchase successful!');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        await requestNotificationPermissions();
        
        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        console.log('Purchase failed or was cancelled');
        Alert.alert("Purchase Failed", "We couldn't complete your subscription. Please try again.");
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert("Error", "Something went wrong with your purchase. Please try again.");
    } finally {
      hasStartedPurchase.current = false;
      setLoading(false);
    }
  };

  // Simplified restore function using only RevenueCat
  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);

    try {
      console.log('Attempting to restore purchases...');
      const restored = await RevenueCatService.restorePurchases();
      
      if (restored) {
        console.log('Purchases restored successfully!');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        console.log('No purchases to restore');
        Alert.alert("No Subscription Found", "We couldn't find any active subscriptions to restore.");
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert("Restore Error", "There was a problem restoring your purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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