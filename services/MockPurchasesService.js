import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock product data
const MOCK_PRODUCTS = {
  MONTHLY_SUBSCRIPTION: {
    productId: 'com.yourapp.subscription.monthly',
    title: 'Monthly Subscription',
    description: 'Access to all premium features for one month',
    price: '$12.99',
    priceAmountMicros: 12990000,
    priceCurrencyCode: 'USD',
  },
  YEARLY_SUBSCRIPTION: {
    productId: 'com.yourapp.subscription.yearly',
    title: 'Yearly Subscription',
    description: 'Access to all premium features for one year',
    price: '$59.99',
    priceAmountMicros: 59990000,
    priceCurrencyCode: 'USD',
    // This is what would show as $4.99/month
  }
};

class MockPurchasesService {
  constructor() {
    this.products = Object.values(MOCK_PRODUCTS);
    this.isInitialized = false;
  }

  // Initialize the mock service
  async initialize() {
    if (!this.isInitialized) {
      console.log('Mock purchases service initialized');
      this.isInitialized = true;
      
      // Simulate a network delay
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    return true;
  }
  
  // Get all products
  async getProducts() {
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.products;
  }
  
  // Simulate a purchase
  async purchaseSubscription(isYearly) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const productId = isYearly 
      ? MOCK_PRODUCTS.YEARLY_SUBSCRIPTION.productId 
      : MOCK_PRODUCTS.MONTHLY_SUBSCRIPTION.productId;
    
    // Create a mock purchase receipt
    const purchase = {
      productId,
      transactionId: `mock-transaction-${Date.now()}`,
      transactionDate: new Date().toISOString(),
      purchaseTime: Date.now(),
    };
    
    // Store the purchase info
    await this.storePurchase(purchase);
    
    return true;
  }
  
  // Store purchase info in AsyncStorage
  async storePurchase(purchase) {
    const isYearly = purchase.productId === MOCK_PRODUCTS.YEARLY_SUBSCRIPTION.productId;
    
    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date();
    if (isYearly) {
      expiryDate.setFullYear(now.getFullYear() + 1);
    } else {
      expiryDate.setMonth(now.getMonth() + 1);
    }
    
    const subscriptionInfo = {
      ...purchase,
      expiryDate: expiryDate.toISOString(),
      isActive: true,
      type: isYearly ? 'yearly' : 'monthly',
    };
    
    await AsyncStorage.setItem('mock_subscription', JSON.stringify(subscriptionInfo));
    return subscriptionInfo;
  }
  
  // Check if user has an active subscription
  async hasActiveSubscription() {
    try {
      const subscriptionData = await AsyncStorage.getItem('mock_subscription');
      if (!subscriptionData) return false;
      
      const subscription = JSON.parse(subscriptionData);
      const now = new Date();
      const expiryDate = new Date(subscription.expiryDate);
      
      return expiryDate > now;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }
  
  // Restore purchases (for testing)
  async restorePurchases() {
    // Just check if there's a stored subscription
    return await this.hasActiveSubscription();
  }
  
  // Get subscription details
  async getSubscriptionDetails() {
    try {
      const subscriptionData = await AsyncStorage.getItem('mock_subscription');
      if (!subscriptionData) return null;
      
      return JSON.parse(subscriptionData);
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }
  
  // Cancel subscription (for testing)
  async cancelSubscription() {
    await AsyncStorage.removeItem('mock_subscription');
    return true;
  }
}

const mockPurchasesService = new MockPurchasesService();
export default mockPurchasesService; 