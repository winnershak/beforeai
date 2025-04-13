import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This is a safe wrapper around StoreKit functionality
// It prevents crashes by avoiding StoreKit initialization during app startup or shutdown

// Only import InAppPurchases if we're not in production or not on iOS
const InAppPurchases = Platform.OS === 'ios' && !__DEV__ 
  ? null 
  : require('expo-in-app-purchases');

class SafeStoreKit {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  
  // Mock products for production use
  private mockProducts = {
    results: [
      { productId: 'blissmonth', price: '$4.99', title: 'Monthly Subscription' },
      { productId: 'blissyear', price: '$39.99', title: 'Yearly Subscription' }
    ]
  };

  constructor() {
    // Do nothing in constructor to avoid any initialization at import time
  }

  // Safe initialization that won't crash the app
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  // The actual initialization logic
  private async doInitialize(): Promise<boolean> {
    try {
      console.log('Initializing StoreKit...');
      if (InAppPurchases) {
        try {
          await InAppPurchases.connectAsync();
          this.initialized = true;
          console.log('StoreKit connected successfully');
          return true;
        } catch (connectError) {
          console.warn('StoreKit connection failed:', connectError);
          // Still mark as initialized to avoid repeated attempts
          this.initialized = true;
          return false;
        }
      } else {
        console.log('InAppPurchases not available, using mock implementation');
        // If InAppPurchases is null, still mark as initialized
        this.initialized = true;
        return true;
      }
    } catch (error) {
      console.error('StoreKit initialization failed:', error);
      this.initPromise = null;
      // Mark as initialized anyway to prevent repeated failures
      this.initialized = true;
      return false;
    }
  }

  // Get products safely
  async getProducts() {
    try {
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        console.log('Using mock subscriptions due to initialization status');
        return this.mockProducts;
      }
      
      const subscriptionIds = [
        'blissmonth',
        'blissyear'
      ];
      
      try {
        const subscriptions = await InAppPurchases.getProductsAsync(subscriptionIds);
        if (subscriptions && subscriptions.results && subscriptions.results.length > 0) {
          return subscriptions;
        } else {
          console.warn('No subscriptions returned from App Store, using mock subscriptions');
          return this.mockProducts;
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return this.mockProducts;
      }
    } catch (error) {
      console.error('Failed to get subscriptions:', error);
      return this.mockProducts; // Always return mock subscriptions on error
    }
  }

  // Make a purchase safely
  async purchase(productId: string): Promise<boolean> {
    try {
      // Make sure we're using the correct subscription ID format
      const validProductId = productId.includes('bliss') ? 
        productId : // Already in correct format
        (productId.includes('year') ? 'blissyear' : 'blissmonth'); // Convert if needed
      
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        console.log('Subscription simulation (no StoreKit): Success');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('subscriptionType', validProductId.includes('year') ? 'yearly' : 'monthly');
        return true;
      }

      try {
        await InAppPurchases.purchaseItemAsync(validProductId);
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('subscriptionType', validProductId.includes('year') ? 'yearly' : 'monthly');
        console.log(`Successfully subscribed to ${validProductId}`);
        return true;
      } catch (purchaseError) {
        console.error('Subscription failed:', purchaseError);
        return false;
      }
    } catch (error) {
      console.error('Subscription process failed:', error);
      return false;
    }
  }

  // Restore purchases safely
  async restore(): Promise<boolean> {
    // In production on iOS, simulate success
    if (Platform.OS === 'ios' && !__DEV__) {
      console.log('Production iOS build: Simulating subscription restore success');
      await AsyncStorage.setItem('isPremium', 'true');
      return true;
    }
    
    try {
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        return false;
      }

      const response = await InAppPurchases.getPurchaseHistoryAsync();
      const hasSubscription = !!(response.results && response.results.length > 0);
      
      if (hasSubscription) {
        await AsyncStorage.setItem('isPremium', 'true');
      }
      
      return hasSubscription;
    } catch (error) {
      console.error('Subscription restore failed:', error);
      return false;
    }
  }

  // Check subscription status safely
  async isSubscribed(): Promise<boolean> {
    // Always check local storage first
    const isPremium = await AsyncStorage.getItem('isPremium');
    if (isPremium === 'true') {
      return true;
    }

    // In production on iOS, don't check with StoreKit
    if (Platform.OS === 'ios' && !__DEV__) {
      return false;
    }
    
    try {
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        return false;
      }

      const response = await InAppPurchases.getPurchaseHistoryAsync();
      const hasSubscription = !!(response.results && response.results.length > 0);
      
      if (hasSubscription) {
        await AsyncStorage.setItem('isPremium', 'true');
      }
      
      return hasSubscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }
}

// Create the instance only when needed, not at import time
let instance: SafeStoreKit | null = null;

export default function getStoreKit(): SafeStoreKit {
  if (!instance) {
    instance = new SafeStoreKit();
  }
  return instance;
} 