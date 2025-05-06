#import <React/RCTBridgeModule.h>
#import <AVFoundation/AVFoundation.h>

@interface RCT_EXTERN_MODULE(AlarmSound, NSObject)

RCT_EXTERN_METHOD(configureAudio)

RCT_EXTERN_METHOD(playAlarmSound:(NSString *)soundName
                  volume:(float)volume
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopAlarmSound:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(debugSoundFiles:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cleanup)

@end 
