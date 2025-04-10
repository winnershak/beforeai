import * as InAppPurchases from 'expo-in-app-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your product IDs
const PRODUCTS = {
  MONTHLY: 'blissmonth',
  YEARLY: 'blissyear',
};

// Add a debug log to confirm the updated values
console.log('UPDATED PRODUCT IDs ARE BEING USED:', PRODUCTS);

// Add this debug log
console.log('IAPService - PRODUCT IDs:', PRODUCTS);

class IAPService {
  private initialized = false;

  constructor() {
    console.log('IAPService initialized with product IDs:', PRODUCTS);
  }

  async initialize() {
    if (this.initialized) {
      console.log('IAP already initialized, skipping');
      return true;
    }

    try {
      // Set up purchase listener first
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('Purchase event received:', { responseCode, results, errorCode });
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('Purchase successful:', results);
          AsyncStorage.setItem('isPremium', 'true');
          AsyncStorage.setItem('quizCompleted', 'true');
        } else {
          console.error('Purchase failed with code:', responseCode, errorCode);
        }
      });

      // Connect to the App Store
      await this.connectToStore();

      // Verify products are available
      const productTest = await InAppPurchases.getProductsAsync([
        PRODUCTS.MONTHLY,
        PRODUCTS.YEARLY
      ]);
      console.log('Available products from store:', productTest);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('IAP initialization failed:', error);
      return false;
    }
  }

  async getProducts() {
    try {
      await this.ensureInitialized();
      console.log('Fetching products from store...');
      const result = await InAppPurchases.getProductsAsync([
        PRODUCTS.MONTHLY,
        PRODUCTS.YEARLY,
      ]);
      
      console.log('Raw products from store:', result);
      
      const products = result.results || [];
      
      if (products.length === 0) {
        console.warn('No products available from store');
        return [];
      }
      
      return products.map(product => ({
        identifier: product.productId,
        packageType: product.productId.includes('monthly') ? 'monthly' : 'yearly',
        product: {
          price: parseFloat(product.price),
          priceString: product.price,
          title: product.title || product.description
        }
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  async purchaseProduct(productId: string) {
    try {
      console.log(`Attempting to purchase product: ${productId}`);
      await this.ensureInitialized();
      
      // IMPORTANT: First load the products from the store
      console.log('Loading products before purchase...');
      
      try {
        const products = await InAppPurchases.getProductsAsync([productId]);
        
        console.log('Products loaded for purchase:', JSON.stringify(products, null, 2));
        
        if (!products.results || products.results.length === 0) {
          console.error(`No product found with ID: ${productId}`);
          return false;
        }
        
        // Now purchase the product
        console.log(`Product verified, proceeding with purchase of ${productId}`);
        await InAppPurchases.purchaseItemAsync(productId);
        
        // If we get here without an error, the purchase was successful
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        return true;
      } catch (purchaseError) {
        console.error('Error during purchase flow:', purchaseError);
        
        return false;
      }
    } catch (error) {
      console.error('Error purchasing product:', error);
      return false;
    }
  }

  async restorePurchases() {
    try {
      await this.ensureInitialized();
      
      // getPurchaseHistoryAsync returns IAPQueryResponse
      const response = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (response.results && response.results.length > 0) {
        await AsyncStorage.setItem('isPremium', 'true');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }

  async checkSubscriptionStatus() {
    try {
      await this.ensureInitialized();
      
      // getPurchaseHistoryAsync returns IAPQueryResponse
      const response = await InAppPurchases.getPurchaseHistoryAsync();
      
      const isPremium = response.results && response.results.length > 0;
      
      await AsyncStorage.setItem('isPremium', isPremium ? 'true' : 'false');
      return isPremium;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      const storedPremium = await AsyncStorage.getItem('isPremium');
      return storedPremium === 'true';
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Connect to the App Store
  private async connectToStore(): Promise<boolean> {
    try {
      // Check if already connected before trying to connect
      try {
        // If this doesn't throw, we're already connected
        await InAppPurchases.getPurchaseHistoryAsync();
        console.log('Already connected to App Store');
        return true;
      } catch (e) {
        // If it throws with a different error, log it but continue
        if (e && (e as Error).message && !(e as Error).message.includes('Must be connected')) {
          console.log('Error checking connection status:', e);
        }
        // Not connected, will proceed to connect
      }
      
      // Connect to store
      console.log('Connecting to App Store...');
      await InAppPurchases.connectAsync();
      console.log('Successfully connected to App Store');
      return true;
    } catch (error) {
      // Only log if it's not an "already connected" error
      if (error && (error as Error).message && !(error as Error).message.includes('Already connected')) {
        console.error('Store connection error:', error);
      }
      return false;
    }
  }
}

export default new IAPService();