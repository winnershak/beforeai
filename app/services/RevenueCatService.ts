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
    try {
      const storeKit = getStoreKit();
      const products = await storeKit.getProducts();
      
      // Check if products is an array before mapping
      if (!products || !Array.isArray(products)) {
        console.warn('getProducts did not return an array:', products);
        return []; // Return empty array instead of failing
      }
      
      // Properly label products as subscriptions
      return products.map((product: any) => ({
        ...product,
        type: 'subscription',
        // Add any other subscription-specific properties
        subscriptionPeriod: product.productIdentifier.includes('year') ? 'yearly' : 'monthly'
      }));
    } catch (error) {
      console.error('Error getting subscription packages:', error);
      return []; // Return empty array on error
    }
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

  async getProductType(productId: string): Promise<'subscription'> {
    // All our products are subscriptions
    return 'subscription';
  }

  async validateReceiptSilently(): Promise<boolean> {
    try {
      // Instead of trying to use a method that doesn't exist,
      // we'll use methods we know exist in the SafeStoreKit interface
      const storeKit = getStoreKit();
      
      // First check if the user is subscribed (this method definitely exists)
      const isSubscribed = await storeKit.isSubscribed();
      
      if (isSubscribed) {
        return true;
      }
      
      // If not subscribed, try to restore purchases silently
      // This is a common pattern that doesn't require user authentication in most cases
      try {
        const restored = await storeKit.restore();
        return restored;
      } catch (restoreError) {
        console.log('Silent restore failed:', restoreError);
        return false;
      }
    } catch (error) {
      console.warn('Silent receipt validation failed:', error);
      return false;
    }
  }
}

export default new RevenueCatService(); 