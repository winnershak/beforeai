import AsyncStorage from '@react-native-async-storage/async-storage';
import getStoreKit from './SafeStoreKit';

// This is a wrapper around RevenueCat for backward compatibility
class RevenueCatService {
  async initialize(): Promise<boolean> {
    try {
      // In production, don't initialize StoreKit
      if (!__DEV__) {
        console.log('Production build: Bypassing RevenueCat initialization');
        return true;
      }
      
      // In development, initialize safely
      return await getStoreKit().initialize();
    } catch (error) {
      console.warn('RevenueCat initialization failed:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      // Always check local storage first for safety
      const isPremium = await AsyncStorage.getItem('isPremium');
      return isPremium === 'true';
    } catch (error) {
      console.error('Error in isSubscribed:', error);
      return false;
    }
  }

  // Only call this when explicitly needed
  async verifySubscription(): Promise<boolean> {
    return await getStoreKit().isSubscribed();
  }

  // For backward compatibility
  async purchaseProduct(productId: string): Promise<boolean> {
    return await getStoreKit().purchase(productId);
  }

  // For backward compatibility
  async restorePurchases(): Promise<boolean> {
    return await getStoreKit().restore();
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    const result = await getStoreKit().isSubscribed();
    return result === true;
  }

  async getSubscriptionPackages() {
    const storeKit = getStoreKit();
    return storeKit.getProducts();
  }

  async getSubscriptionDetails() {
    try {
      // Check if user is subscribed
      const isSubscribed = await this.isSubscribed();
      
      if (!isSubscribed) {
        return null;
      }
      
      // Create default dates
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      
      const subscriptionType = await this.getSubscriptionType();
      
      return {
        expirationDate,
        latestPurchaseDate: new Date(),
        productIdentifier: subscriptionType === 'yearly' ? 'blissyear' : 'blissmonth',
        isYearly: subscriptionType === 'yearly'
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }

  async safelyGetSubscriptionDetails() {
    try {
      return await this.getSubscriptionDetails();
    } catch (error) {
      console.error('Error in safelyGetSubscriptionDetails:', error);
      
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      
      return {
        expirationDate: expirationDate,
        latestPurchaseDate: new Date(),
        productIdentifier: 'blissyearly',
        isYearly: true
      };
    }
  }

  async checkLocalSubscriptionStatus(): Promise<boolean> {
    const storedPremium = await AsyncStorage.getItem('isPremium');
    return storedPremium === 'true';
  }

  async getSubscriptionType(): Promise<'monthly' | 'yearly' | null> {
    try {
      // For development builds, just return a default
      if (__DEV__) {
        const isPremium = await AsyncStorage.getItem('isPremium');
        if (isPremium === 'true') {
          const subscriptionType = await AsyncStorage.getItem('subscriptionType') || 'monthly';
          return subscriptionType as 'monthly' | 'yearly';
        }
        return null;
      }
      
      // For production, use the existing method
      const isSubscribed = await getStoreKit().isSubscribed();
      if (!isSubscribed) return null;
      
      // You'll need to implement a way to determine subscription type
      // For now, default to monthly if subscribed
      return 'monthly';
    } catch (error) {
      console.error('Error getting subscription type:', error);
      return null;
    }
  }
}

export default new RevenueCatService(); 