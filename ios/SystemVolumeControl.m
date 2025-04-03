#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SystemVolumeControl, NSObject)

RCT_EXTERN_METHOD(setSystemVolume:(float)volume
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(restoreOriginalVolume:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end 