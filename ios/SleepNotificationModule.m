#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SleepNotificationModule, NSObject)

RCT_EXTERN_METHOD(
  scheduleSleepReminder:(NSInteger)hour
  minute:(NSInteger)minute
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  cancelSleepReminder:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end 
