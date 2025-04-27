import Foundation
import MediaPlayer
import AVFoundation

@objc(SystemVolumeControl)
class SystemVolumeControl: NSObject {
  private var volumeView: MPVolumeView?
  private var originalVolume: Float = 0.5
  
  @objc
  func setSystemVolume(_ volume: NSNumber, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // PRODUCTION SAFETY: Don't modify volume at startup in production
    let isProduction = Bundle.main.object(forInfoDictionaryKey: "IS_PRODUCTION") as? Bool ?? false
    if isProduction {
      print("Production build: Bypassing volume control for stability")
      resolver(true)
      return
    }
    
    DispatchQueue.main.async {
      // Store original volume to restore later if needed
      self.originalVolume = AVAudioSession.sharedInstance().outputVolume
      
      // Create hidden volume view if needed
      if self.volumeView == nil {
        self.volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
        if let volumeView = self.volumeView, 
           let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
          window.addSubview(volumeView)
        }
      }
      
      // Find the slider in the volume view
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        // Set the volume
        volumeSlider.value = volume.floatValue
        resolver(true)
      } else {
        rejecter("error", "Could not find volume slider", nil)
      }
    }
  }
  
  @objc
  func restoreOriginalVolume(_ resolver: @escaping RCTPromiseResolveBlock,
                             rejecter: @escaping RCTPromiseRejectBlock) {
    // PRODUCTION SAFETY: Don't modify volume at startup in production
    let isProduction = Bundle.main.object(forInfoDictionaryKey: "IS_PRODUCTION") as? Bool ?? false
    if isProduction {
      print("Production build: Bypassing volume control for stability")
      resolver(true)
      return
    }
    
    DispatchQueue.main.async {
      print("🔊 Attempting to restore original volume: \(self.originalVolume)")
      
      // Find the slider in the volume view
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        // Set the volume
        volumeSlider.value = self.originalVolume
        
        // Also try using the MPVolumeView directly
        let systemVolumeSlider = MPVolumeView().subviews.first(where: { $0 is UISlider }) as? UISlider
        systemVolumeSlider?.value = self.originalVolume
        
        print("✅ Volume restored to: \(self.originalVolume)")
        resolver(true)
      } else {
        // If we can't find the slider, try creating a new one
        self.volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
        if let volumeView = self.volumeView,
           let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
          window.addSubview(volumeView)
          
          // Try again with the new view
          if let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
            volumeSlider.value = self.originalVolume
            print("✅ Volume restored with new slider: \(self.originalVolume)")
            resolver(true)
            return
          }
        }
        
        print("❌ Could not find volume slider to restore")
        rejecter("error", "Could not find volume slider", nil)
      }
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 