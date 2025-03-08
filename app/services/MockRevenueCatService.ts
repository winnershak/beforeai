import AsyncStorage from '@react-native-async-storage/async-storage';

class MockRevenueCatService {
  async initialize() {
    console.log('Mock RevenueCat initialized');
    await AsyncStorage.setItem('isPremium', 'true');
    return true;
  }
  
  async checkSubscriptionStatus() {
    return true;
  }
  
  async getSubscriptionPackages() {
    return [{
      identifier: 'monthly',
      packageType: 'monthly',
      product: {
        price: 4.99,
        priceString: '$4.99',
        title: 'Monthly Subscription'
      }
    }, {
      identifier: 'annual',
      packageType: 'annual',
      product: {
        price: 39.99,
        priceString: '$39.99',
        title: 'Annual Subscription'
      }
    }];
  }
  
  async purchasePackage() {
    await AsyncStorage.setItem('isPremium', 'true');
    await AsyncStorage.setItem('quizCompleted', 'true');
    return true;
  }
  
  async restorePurchases() {
    await AsyncStorage.setItem('isPremium', 'true');
    return true;
  }
  
  async getSubscriptionDetails() {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    return {
      expirationDate: expirationDate,
      latestPurchaseDate: new Date(),
      productIdentifier: 'annual',
      isYearly: true
    };
  }
}

export default new MockRevenueCatService(); 