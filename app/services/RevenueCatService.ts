import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your RevenueCat API keys
const API_KEYS = {
  ios: 'YOUR_IOS_API_KEY',
  android: 'YOUR_ANDROID_API_KEY'
};

// Product IDs for your subscriptions
export const SUBSCRIPTION_SKUS = {
  monthly: 'com.sleepyalarm.monthly',
  yearly: 'com.sleepyalarm.yearly'
};

// Add a mock mode for testing
const USE_MOCK_MODE = true; // Set to false for production

class RevenueCatService {
  async initialize() {
    try {
      if (USE_MOCK_MODE) {
        console.log('RevenueCat running in mock mode');
        return;
      }
      
      // Configure RevenueCat with your API key
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG); // Set to INFO in production
      
      // Use the appropriate API key based on platform
      const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
      await Purchases.configure({ apiKey });
      
      console.log('RevenueCat initialized successfully');
      
      // Check subscription status on initialization
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    }
  }
  
  async checkSubscriptionStatus() {
    if (USE_MOCK_MODE) {
      return true; // Always return premium for testing
    }
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = this.checkIfUserHasActiveSubscription(customerInfo);
      
      // Update premium status in AsyncStorage
      await AsyncStorage.setItem('isPremium', isPremium ? 'true' : 'false');
      
      return isPremium;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
  
  checkIfUserHasActiveSubscription(customerInfo: CustomerInfo) {
    // Check if user has active subscription
    if (customerInfo.entitlements.active['premium']) {
      return true;
    }
    return false;
  }
  
  async getSubscriptionPackages() {
    try {
      // Fetch available offerings
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        console.log('No offerings available');
        return [];
      }
      
      // Return packages from the current offering
      return offerings.current.availablePackages;
    } catch (error) {
      console.error('Error getting subscription packages:', error);
      return [];
    }
  }
  
  async purchasePackage(selectedPackage: PurchasesPackage) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      const isPremium = this.checkIfUserHasActiveSubscription(customerInfo);
      
      // Update premium status in AsyncStorage
      await AsyncStorage.setItem('isPremium', isPremium ? 'true' : 'false');
      
      return isPremium;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Error purchasing package:', error);
      }
      return false;
    }
  }
  
  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = this.checkIfUserHasActiveSubscription(customerInfo);
      
      // Update premium status in AsyncStorage
      await AsyncStorage.setItem('isPremium', isPremium ? 'true' : 'false');
      
      return isPremium;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }
  
  async getSubscriptionDetails() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (this.checkIfUserHasActiveSubscription(customerInfo)) {
        // Get subscription details
        const subscription = customerInfo.entitlements.active['premium'];
        
        return {
          expirationDate: subscription.expirationDate ? new Date(subscription.expirationDate) : new Date(),
          latestPurchaseDate: subscription.latestPurchaseDate ? new Date(subscription.latestPurchaseDate) : new Date(),
          productIdentifier: subscription.productIdentifier,
          isYearly: subscription.productIdentifier.includes('yearly')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }
}

export default new RevenueCatService(); 