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
    // Mock subscription details since IAPService doesn't provide this
    const isPremium = await IAPService.checkSubscriptionStatus();
    
    if (!isPremium) {
      return null;
    }
    
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    return {
      expirationDate,
      latestPurchaseDate: new Date(),
      productIdentifier: 'blissyear',
      isYearly: true
    };
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
}

export default new RevenueCatService(); 