import mockPurchasesService from '../../services/MockPurchasesService';

export const checkSubscriptionStatus = async () => {
  await mockPurchasesService.initialize();
  return await mockPurchasesService.hasActiveSubscription();
};

export const getSubscriptionDetails = async () => {
  await mockPurchasesService.initialize();
  return await mockPurchasesService.getSubscriptionDetails();
};

// For testing - simulate subscription expiration
export const expireSubscription = async () => {
  await mockPurchasesService.cancelSubscription();
}; 