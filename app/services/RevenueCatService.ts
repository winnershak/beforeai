import AsyncStorage from '@react-native-async-storage/async-storage';
import IAPService from './IAPService';

// This is a wrapper around IAPService that maintains the same interface
// as your original RevenueCatService for backward compatibility
class RevenueCatService {
  async initialize() {
    return IAPService.initialize();
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    const result = await IAPService.checkSubscriptionStatus();
    return result === true;
  }

  async getSubscriptionPackages() {
    return IAPService.getProducts();
  }

  async purchasePackage(selectedPackage: any) {
    try {
      // For development builds, always succeed
      if (__DEV__) {
        console.log('DEV MODE: Simulating successful purchase');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        return true;
      }
      
      // For production, use the real purchase flow
      return await IAPService.purchaseProduct(selectedPackage.identifier);
    } catch (error) {
      console.error('Error in purchasePackage:', error);
      return false;
    }
  }

  async restorePurchases() {
    return IAPService.restorePurchases();
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
        productIdentifier: 'blissyear',
        isYearly: true
      };
    }
  }

  async checkLocalSubscriptionStatus(): Promise<boolean> {
    const storedPremium = await AsyncStorage.getItem('isPremium');
    return storedPremium === 'true';
  }

  async isSubscribed(): Promise<boolean> {
    try {
      // For development builds, check the premium flag
      if (__DEV__) {
        const isPremium = await AsyncStorage.getItem('isPremium');
        return isPremium === 'true';
      }
      
      // For production, check actual subscription status and handle undefined
      const status = await IAPService.checkSubscriptionStatus();
      return status === true;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
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
      const isSubscribed = await IAPService.checkSubscriptionStatus();
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