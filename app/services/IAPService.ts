import * as InAppPurchases from 'expo-in-app-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your product IDs
const PRODUCTS = {
  MONTHLY: 'blissmonth',
  YEARLY: 'blissyear',
};

class IAPService {
  private initialized = false;
  private useMockMode = false; // Make sure this is false for production

  async initialize() {
    if (this.initialized) {
      console.log('IAP already initialized, skipping');
      return true;
    }

    try {
      if (this.useMockMode) {
        console.log('IAP: Using mock mode');
        this.initialized = true;
        await AsyncStorage.setItem('isPremium', 'true'); // For testing
        return true;
      }

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

      try {
        // Connect to the store - wrap in try/catch to handle "already connected" error
        await InAppPurchases.connectAsync();
        console.log('IAP service initialized successfully');
      } catch (connectError) {
        // If already connected, that's fine
        if ((connectError as Error).message && (connectError as Error).message.includes('Already connected')) {
          console.log('Already connected to App Store, continuing');
        } else {
          // For other errors, rethrow
          throw connectError;
        }
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('IAP initialization failed:', error);
      this.useMockMode = true;
      this.initialized = true;
      await AsyncStorage.setItem('isPremium', 'true'); // Fallback for testing
      return false;
    }
  }

  async getProducts() {
    if (this.useMockMode) {
      return this.getMockProducts();
    }

    try {
      await this.ensureInitialized();
      console.log('Fetching products from store...');
      const result = await InAppPurchases.getProductsAsync([
        PRODUCTS.MONTHLY,
        PRODUCTS.YEARLY,
      ]);
      
      console.log('Products result:', JSON.stringify(result, null, 2));
      
      // getProductsAsync returns { results: Product[] }
      const products = result.results || [];
      
      if (products.length === 0) {
        console.warn('No products available from store');
        return this.getMockProducts();
      }
      
      const mappedProducts = products.map(product => ({
        identifier: product.productId,
        packageType: product.productId.includes('month') ? 'monthly' : 'yearly',
        product: {
          price: parseFloat(product.price),
          priceString: product.price,
          title: product.title || product.description
        }
      }));
      
      console.log('Mapped products:', JSON.stringify(mappedProducts, null, 2));
      return mappedProducts;
    } catch (error) {
      console.error('Error getting products:', error);
      return this.getMockProducts();
    }
  }

  async purchaseProduct(productId: string) {
    if (this.useMockMode) {
      console.log('Mock mode: simulating successful purchase');
      await AsyncStorage.setItem('isPremium', 'true');
      await AsyncStorage.setItem('quizCompleted', 'true');
      return true;
    }

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
        
        // For development testing, simulate success
        if (__DEV__) {
          console.log('DEV MODE: Simulating successful purchase despite error');
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('quizCompleted', 'true');
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error purchasing product:', error);
      return false;
    }
  }

  async restorePurchases() {
    if (this.useMockMode) {
      await AsyncStorage.setItem('isPremium', 'true');
      return true;
    }

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
    if (this.useMockMode) {
      return true;
    }

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

  private getMockProducts() {
    return [
      {
        identifier: PRODUCTS.MONTHLY,
        packageType: 'monthly',
        product: {
          price: 12.99,
          priceString: '$12.99',
          title: 'Monthly Subscription'
        }
      }, 
      {
        identifier: PRODUCTS.YEARLY,
        packageType: 'yearly',
        product: {
          price: 79.99,
          priceString: '$79.99',
          title: 'Annual Subscription'
        }
      }
    ];
  }
}

export default new IAPService();