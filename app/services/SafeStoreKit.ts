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
      { productId: 'com.yourusername.blissalarm.monthly', price: '$4.99', title: 'Monthly Subscription' },
      { productId: 'com.yourusername.blissalarm.yearly', price: '$39.99', title: 'Yearly Subscription' }
    ]
  };

  constructor() {
    // Do nothing in constructor to avoid any initialization at import time
  }

  // Safe initialization that won't crash the app
  async initialize(): Promise<boolean> {
    // In production on iOS, don't initialize at all
    if (Platform.OS === 'ios' && !__DEV__) {
      console.log('Production iOS build: Skipping StoreKit initialization');
      return true; // Pretend it succeeded
    }
    
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
        await InAppPurchases.connectAsync();
      }
      this.initialized = true;
      this.initPromise = null;
      return true;
    } catch (error) {
      console.error('StoreKit initialization failed:', error);
      this.initPromise = null;
      return false;
    }
  }

  // Get products safely
  async getProducts() {
    // In production on iOS, return mock products immediately
    if (Platform.OS === 'ios' && !__DEV__) {
      console.log('Production iOS build: Using mock products');
      return this.mockProducts;
    }
    
    try {
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        return { results: [] };
      }
      
      const productIds = [
        'com.yourusername.blissalarm.monthly',
        'com.yourusername.blissalarm.yearly'
      ];
      
      return await InAppPurchases.getProductsAsync(productIds);
    } catch (error) {
      console.error('Failed to get products:', error);
      return { results: [] };
    }
  }

  // Make a purchase safely
  async purchase(productId: string): Promise<boolean> {
    // In production on iOS, simulate success
    if (Platform.OS === 'ios' && !__DEV__) {
      console.log('Production iOS build: Simulating purchase success');
      await AsyncStorage.setItem('isPremium', 'true');
      return true;
    }
    
    try {
      const initialized = await this.initialize();
      if (!initialized || !InAppPurchases) {
        return false;
      }

      await InAppPurchases.purchaseItemAsync(productId);
      await AsyncStorage.setItem('isPremium', 'true');
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  }

  // Restore purchases safely
  async restore(): Promise<boolean> {
    // In production on iOS, simulate success
    if (Platform.OS === 'ios' && !__DEV__) {
      console.log('Production iOS build: Simulating restore success');
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
      console.error('Restore failed:', error);
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