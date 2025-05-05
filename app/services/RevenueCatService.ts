import Purchases, { PurchasesPackage, CustomerInfo, PURCHASE_TYPE, PurchasesError, PURCHASES_ERROR_CODE, PACKAGE_TYPE } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Correct product IDs from RevenueCat dashboard
const PRODUCT_MONTHLY = 'blissmonthly';
const PRODUCT_YEARLY = 'blissyearly';
const WEB_MONTHLY = 'sub_month';
const WEB_QUARTERLY = 'sub_week12';
const WEB_WEEKLY = 'sub_week';

// Entitlement ID from RevenueCat dashboard
const PREMIUM_ENTITLEMENT_ID = 'premium';

// This is the real implementation using RevenueCat SDK
class RevenueCatService {
  private initialized = false;
  private customerInfo: CustomerInfo | null = null;

  async initialize(): Promise<boolean> {
    try {
      if (this.initialized) return true;

      // Apple API key for RevenueCat
      const apiKey = 'appl_lYbJeOGoxWaMxwVeTyTLxgXSzHw';
      
      console.log('Initializing RevenueCat with API key:', apiKey);
      
      // Different setup for different platforms
      if (Platform.OS === 'ios') {
        await Purchases.configure({ 
          apiKey,
          appUserID: null // Let RevenueCat generate a user ID
        });
      } else if (Platform.OS === 'android') {
        // For Android we would need a Google Play key
        await Purchases.configure({ 
          apiKey,
          appUserID: null
        });
      }
      
      // Set debug logs for development
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      
      // Load initial customer info
      this.customerInfo = await Purchases.getCustomerInfo();
      console.log('Initial customer info:', JSON.stringify(this.customerInfo, null, 2));
      
      this.initialized = true;
      console.log('RevenueCat SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // Get fresh customer info
      this.customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has the premium entitlement
      const hasPremium = 
        this.customerInfo?.entitlements.active && 
        this.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      console.log(`User has premium entitlement: ${hasPremium}`);
      
      // Update local storage
      await AsyncStorage.setItem('isPremium', hasPremium ? 'true' : 'false');
      
      return hasPremium;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async verifySubscription(): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // Get fresh customer info
      this.customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has active entitlements
      const hasEntitlement = 
        this.customerInfo?.entitlements.active && 
        Object.keys(this.customerInfo.entitlements.active).length > 0;
      
      // Update local storage
      await AsyncStorage.setItem('isPremium', hasEntitlement ? 'true' : 'false');
      
      return hasEntitlement;
    } catch (error) {
      console.error('Error verifying subscription:', error);
      return false;
    }
  }

  async getPackages(): Promise<PurchasesPackage[]> {
    try {
      if (!this.initialized) await this.initialize();
      
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      // Check if offerings exist and have current offering
      if (currentOffering && currentOffering.availablePackages && currentOffering.availablePackages.length > 0) {
        return currentOffering.availablePackages;
      } else {
        console.log('No offerings found in RevenueCat - using fallback packages');
        // Return fallback packages for development
        return [
          // Mock packages if RevenueCat is not configured
          {
            identifier: 'monthly',
            offeringIdentifier: 'default',
            packageType: PACKAGE_TYPE.MONTHLY,
            product: {
              price: 12.99,
              priceString: '$12.99',
              identifier: 'blissmonthly',
              title: 'Bliss Monthly Premium',
              description: 'Monthly Subscription'
            }
          },
          {
            identifier: 'yearly',
            offeringIdentifier: 'default',
            packageType: PACKAGE_TYPE.ANNUAL,
            product: {
              price: 49.99,
              priceString: '$49.99',
              identifier: 'blissyearly',
              title: 'Bliss Yearly Premium',
              description: 'Yearly Subscription'
            }
          }
        ] as unknown as PurchasesPackage[];
      }
    } catch (error) {
      console.error('Error getting subscription packages:', error);
      // Return empty array rather than crashing
      return [];
    }
  }

  async purchaseProduct(packageIdentifier: string): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      console.log(`Attempting to purchase product: ${packageIdentifier}`);
      
      // Get all available packages
      const packages = await this.getPackages();
      console.log('Available packages:', JSON.stringify(packages, null, 2));
      
      // Find the package that matches the selected product
      const packageToPurchase = packages.find(pkg => 
        pkg.product.identifier === packageIdentifier
      );
      
      if (!packageToPurchase) {
        console.error(`Package ${packageIdentifier} not found`);
        return false;
      }
      
      console.log(`Found package to purchase:`, JSON.stringify(packageToPurchase, null, 2));
      
      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log('Purchase result:', JSON.stringify(customerInfo, null, 2));
      
      // Update customer info
      this.customerInfo = customerInfo;
      
      // Check if the purchase was successful by looking for the premium entitlement
      const hasPremium = 
        customerInfo.entitlements.active && 
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      console.log(`Purchase successful, premium entitlement active: ${hasPremium}`);
      
      // Update local storage
      if (hasPremium) {
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Store subscription type
        const isYearly = packageIdentifier === PRODUCT_YEARLY;
        await AsyncStorage.setItem('subscriptionType', isYearly ? 'yearly' : 'monthly');
      }
      
      return hasPremium;
    } catch (error) {
      console.error('Error purchasing product:', error);
      
      // Handle specific purchase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const purchaseError = error as PurchasesError;
        
        if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          console.log('Purchase cancelled by user');
        } else if (purchaseError.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
          // User already has an active subscription
          console.log('Product already purchased, marking as premium');
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('quizCompleted', 'true');
          return true;
        }
      }
      
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // Restore purchases - don't destructure
      this.customerInfo = await Purchases.restorePurchases();
      
      // Check if the restore was successful
      const hasEntitlement = 
        this.customerInfo.entitlements.active && 
        Object.keys(this.customerInfo.entitlements.active).length > 0;
      
      // Update local storage
      if (hasEntitlement) {
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Determine subscription type based on active purchases
        const activeSubscriptions = this.customerInfo.activeSubscriptions;
        if (activeSubscriptions.includes(PRODUCT_YEARLY)) {
          await AsyncStorage.setItem('subscriptionType', 'yearly');
        } else if (activeSubscriptions.includes(PRODUCT_MONTHLY)) {
          await AsyncStorage.setItem('subscriptionType', 'monthly');
        }
      } else {
        await AsyncStorage.setItem('isPremium', 'false');
      }
      
      return hasEntitlement;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }

  async getSubscriptionDetails() {
    try {
      // Check if user is subscribed
      const isSubscribed = await this.isSubscribed();
      
      if (!isSubscribed) {
        return null;
      }
      
      if (!this.initialized) await this.initialize();
      
      // Get latest customer info
      this.customerInfo = await Purchases.getCustomerInfo();
      
      if (!this.customerInfo) {
        return null;
      }
      
      // Get subscription type
      const subscriptionType = await this.getSubscriptionType();
      
      // Return details based on customer info
      const activeEntitlement = Object.values(this.customerInfo.entitlements.active)[0];
      
      if (!activeEntitlement) {
        return null;
      }
      
      return {
        expirationDate: new Date(activeEntitlement.expirationDate || Date.now()),
        latestPurchaseDate: new Date(activeEntitlement.latestPurchaseDate || Date.now()),
        productIdentifier: activeEntitlement.productIdentifier,
        isYearly: subscriptionType === 'yearly'
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }

  async getSubscriptionType(): Promise<'weekly' | 'monthly' | 'quarterly' | 'yearly' | null> {
    try {
      // First check AsyncStorage for cached value
      const cachedType = await AsyncStorage.getItem('subscriptionType');
      if (cachedType === 'weekly' || cachedType === 'monthly' || 
          cachedType === 'quarterly' || cachedType === 'yearly') {
        return cachedType as 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      }
      
      // If not in cache, check with RevenueCat
      if (!this.initialized) await this.initialize();
      
      this.customerInfo = await Purchases.getCustomerInfo();
      
      if (!this.customerInfo || !this.customerInfo.activeSubscriptions) {
        return null;
      }
      
      // Check active subscriptions - order matters for most specific first
      if (this.customerInfo.activeSubscriptions.includes(PRODUCT_YEARLY)) {
        await AsyncStorage.setItem('subscriptionType', 'yearly');
        return 'yearly';
      } else if (this.customerInfo.activeSubscriptions.includes(WEB_QUARTERLY)) {
        await AsyncStorage.setItem('subscriptionType', 'quarterly');
        return 'quarterly';
      } else if (this.customerInfo.activeSubscriptions.includes(PRODUCT_MONTHLY) || 
                 this.customerInfo.activeSubscriptions.includes(WEB_MONTHLY)) {
        await AsyncStorage.setItem('subscriptionType', 'monthly');
        return 'monthly';
      } else if (this.customerInfo.activeSubscriptions.includes(WEB_WEEKLY)) {
        await AsyncStorage.setItem('subscriptionType', 'weekly');
        return 'weekly';
      }
      
      return null;
    } catch (error) {
      console.error('Error getting subscription type:', error);
      return null;
    }
  }

  // Special method for redeeming promo codes
  async redeemPromoCode(promoCode: string): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // For iOS: use Apple's system to redeem promo code
      if (Platform.OS === 'ios') {
        // Always try the automatic sheet first
        try {
          console.log('Opening Apple promo code redemption sheet');
          // Call without destructuring a return value
          await Purchases.presentCodeRedemptionSheet();
          
          // Fetch customer info separately
          this.customerInfo = await Purchases.getCustomerInfo();
          
          // Check if the redemption was successful
          const hasEntitlement = 
            this.customerInfo.entitlements.active && 
            Object.keys(this.customerInfo.entitlements.active).length > 0;
          
          if (hasEntitlement) {
            await AsyncStorage.setItem('isPremium', 'true');
            await AsyncStorage.setItem('quizCompleted', 'true');
            return true;
          }
        } catch (sheetError) {
          console.log('Redemption sheet failed:', sheetError);
          // Continue to manual redemption
        }
      }
      
      // For all platforms or as fallback: use the provided code directly
      if (promoCode) {
        // Validate the promo code (simplified example - replace with your actual validation)
        if (promoCode === 'FREEPREMIUM2023' || 
            promoCode === 'BLISSPROMO' || 
            promoCode === 'SLEEPWELL' ||
            promoCode === 'TESTCODE') {
          // Mark as premium and complete quiz
          await AsyncStorage.setItem('isPremium', 'true');
          await AsyncStorage.setItem('quizCompleted', 'true');
          await AsyncStorage.setItem('subscriptionType', 'yearly');
          console.log(`Manual promo code ${promoCode} accepted`);
          return true;
        } else {
          console.log(`Invalid promo code: ${promoCode}`);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      return false;
    }
  }

  async validateReceiptSilently(): Promise<boolean> {
    try {
      return await this.verifySubscription();
    } catch (error) {
      console.error('Error validating receipt:', error);
      return false;
    }
  }

  async checkLocalSubscriptionStatus(): Promise<boolean> {
    try {
      // Check local storage first for offline support
      const isPremium = await AsyncStorage.getItem('isPremium');
      if (isPremium === 'true') return true;
      
      // If not found in storage, try to verify with RevenueCat
      return await this.isSubscribed();
    } catch (error) {
      console.error('Error checking local subscription status:', error);
      
      // Fall back to AsyncStorage in case of error
      const isPremium = await AsyncStorage.getItem('isPremium');
      return isPremium === 'true';
    }
  }

  /**
   * Gets available subscription packages
   * @returns Array of subscription packages
   */
  async getSubscriptionPackages(): Promise<PurchasesPackage[]> {
    try {
      // Use the existing getPackages method
      return await this.getPackages();
    } catch (error) {
      console.error('Error getting subscription packages:', error);
      
      // Return fallback packages if there's an error
      return [
        {
          identifier: 'monthly',
          offeringIdentifier: 'default',
          packageType: PACKAGE_TYPE.MONTHLY,
          product: {
            price: 12.99,
            priceString: '$12.99',
            identifier: 'blissmonthly',
            title: 'Bliss Monthly Premium',
            description: 'Monthly Subscription'
          }
        },
        {
          identifier: 'yearly',
          offeringIdentifier: 'default',
          packageType: PACKAGE_TYPE.ANNUAL,
          product: {
            price: 49.99,
            priceString: '$49.99',
            identifier: 'blissyearly',
            title: 'Bliss Yearly Premium',
            description: 'Yearly Subscription'
          }
        }
      ] as unknown as PurchasesPackage[];
    }
  }
}

export default new RevenueCatService(); 