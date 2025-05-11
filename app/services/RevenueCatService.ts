import Purchases, { PurchasesPackage, CustomerInfo, PURCHASE_TYPE, PurchasesError, PURCHASES_ERROR_CODE, PACKAGE_TYPE } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Correct product IDs to match App Store Connect
const PRODUCT_MONTHLY = 'blissmonth';
const PRODUCT_YEARLY = 'blissyear';
const WEB_MONTHLY = 'sub_month';
const WEB_QUARTERLY = 'sub_week12';
const WEB_WEEKLY = 'sub_week';

// Entitlement ID from RevenueCat dashboard
const PREMIUM_ENTITLEMENT_ID = 'premium';

// This is the real implementation using RevenueCat SDK
class RevenueCatService {
  private initialized = false;
  private customerInfo: CustomerInfo | null = null;
  private initializationInProgress = false;

  async initialize(): Promise<boolean> {
    try {
      // If already initialized, return immediately
      if (this.initialized) {
        console.log('RevenueCat already initialized, skipping');
        return true;
      }

      // Prevent concurrent initialization
      if (this.initializationInProgress) {
        console.log('RevenueCat initialization already in progress, waiting...');
        // Wait for existing initialization to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.initialized;
      }

      this.initializationInProgress = true;
      
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
      this.initializationInProgress = false;
      console.log('RevenueCat SDK initialized successfully');
      return true;
    } catch (error) {
      this.initializationInProgress = false;
      console.error('Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // Get fresh customer info with extra logging
      console.log('RevenueCatService: Getting customer info...');
      this.customerInfo = await Purchases.getCustomerInfo();
      console.log('RevenueCatService: Raw customer info:', JSON.stringify(this.customerInfo, null, 2));
      
      // Log entitlements specifically
      if (this.customerInfo?.entitlements) {
        console.log('RevenueCatService: Entitlements:', JSON.stringify(this.customerInfo.entitlements, null, 2));
      }
      
      // Check if user has the premium entitlement
      const hasPremium = 
        this.customerInfo?.entitlements.active && 
        this.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      console.log(`RevenueCatService: Has premium entitlement: ${hasPremium}`);
      
      // Update local storage
      await AsyncStorage.setItem('isPremium', hasPremium ? 'true' : 'false');
      
      return hasPremium;
    } catch (error) {
      console.error('RevenueCatService: Error checking subscription status:', error);
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
        console.log('No offerings found in RevenueCat');
        // Return empty array instead of fallback packages
        return [];
      }
    } catch (error) {
      console.error('Error getting subscription packages:', error);
      // Return empty array rather than crashing
      return [];
    }
  }

  async purchaseProduct(productId: string): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      console.log(`Attempting to purchase product: ${productId}`);
      
      // Get available packages
      const packages = await this.getPackages();
      console.log('Available packages:', packages);
      
      // Find the package by type instead of product ID
      let packageToPurchase;
      
      if (productId === 'blissmonth' || productId === 'blissmonthly') {
        // Find monthly package
        packageToPurchase = packages.find(pkg => 
          pkg.packageType === PACKAGE_TYPE.MONTHLY
        );
      } else if (productId === 'blissyear' || productId === 'blissyearly') {
        // Find annual package
        packageToPurchase = packages.find(pkg => 
          pkg.packageType === PACKAGE_TYPE.ANNUAL
        );
      }
      
      if (!packageToPurchase) {
        console.log(`Package for ${productId} not found`);
        return false;
      }
      
      console.log(`Found package: ${packageToPurchase.identifier}`);
      
      // Purchase the package
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Check if the purchase was successful
      const isPremium = customerInfo?.entitlements.active && 
                       customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        console.log('Purchase successful, user has premium entitlement');
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Store the last verification time
        await AsyncStorage.setItem('lastVerifiedSubscription', new Date().toISOString());
        
        return true;
      } else {
        console.log('Purchase completed but user does not have premium entitlement');
        return false;
      }
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
      // Return empty array instead of fallback packages
      return [];
    }
  }

  async identifyUser(userId: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize();
      
      console.log(`Identifying user with RevenueCat: ${userId}`);
      
      // Log any existing customer info before login
      const beforeInfo = await Purchases.getCustomerInfo();
      console.log('RevenueCat - BEFORE login customer info:', JSON.stringify({
        originalAppUserId: beforeInfo.originalAppUserId,
        appUserId: beforeInfo.originalAppUserId,
        firstSeen: beforeInfo.firstSeen,
        activeSubscriptions: beforeInfo.activeSubscriptions,
        allExpirationDates: beforeInfo.allExpirationDates,
        entitlements: beforeInfo.entitlements
      }, null, 2));
      
      // Login with the user ID
      await Purchases.logIn(userId);
      
      // Refresh customer info after login
      this.customerInfo = await Purchases.getCustomerInfo();
      
      // Log detailed customer info after login
      console.log('RevenueCat - AFTER login customer info:', JSON.stringify({
        originalAppUserId: this.customerInfo.originalAppUserId,
        appUserId: this.customerInfo.originalAppUserId,
        firstSeen: this.customerInfo.firstSeen,
        activeSubscriptions: this.customerInfo.activeSubscriptions,
        allExpirationDates: this.customerInfo.allExpirationDates,
        entitlements: this.customerInfo.entitlements
      }, null, 2));
      
      this.emitSubscriptionUpdate();
      
      return;
    } catch (error) {
      console.error('Error identifying user with RevenueCat:', error);
    }
  }

  private emitSubscriptionUpdate(): void {
    // Notify listeners about subscription status change
    const isPremium = this.customerInfo?.entitlements.active && 
                     this.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    
    // Update local storage
    AsyncStorage.setItem('isPremium', isPremium ? 'true' : 'false');
    
    // If premium, also mark quiz as completed
    if (isPremium) {
      AsyncStorage.setItem('quizCompleted', 'true');
    }
    
    console.log(`Subscription status updated: Premium = ${isPremium}`);
  }
}

export default new RevenueCatService(); 