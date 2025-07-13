import Foundation
import MediaPlayer
import AVFoundation

@objc(SystemVolumeControl)
class SystemVolumeControl: NSObject {
  var originalVolume: Float = 0.5
  private var volumeView: MPVolumeView?
  
  // NEW: Save volume without changing it
  @objc
  func saveOriginalVolume(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.originalVolume = AVAudioSession.sharedInstance().outputVolume
      print("💾 Saved original volume: \(self.originalVolume)")
      resolver(self.originalVolume)
    }
  }
  
  @objc
  func setSystemVolume(_ volume: NSNumber, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Store the original volume before changing it
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        self.originalVolume = volumeSlider.value
      }
      
      // Create volume view if it doesn't exist
      if self.volumeView == nil {
        self.volumeView = MPVolumeView(frame: CGRect.zero)
        self.volumeView?.showsVolumeSlider = true
        // Fix: Remove deprecated showsRouteButton for iOS 13+
        if #available(iOS 13.0, *) {
          // Don't set showsRouteButton on iOS 13+
        } else {
          self.volumeView?.showsRouteButton = false
        }
        self.volumeView?.isHidden = true
        
        // Add to a window
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
          // Fix: Use self.volumeView instead of volumeView!
          window.addSubview(self.volumeView!)
        }
      }
      
      // Set volume to max
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        volumeSlider.value = volume.floatValue
        print("🔊 Set volume to: \(volume.floatValue) (original saved as: \(self.originalVolume))")
        resolver(true)
      } else {
        print("⚠️ Could not find volume slider for setting - this is normal on app startup")
        // Don't throw an error, just resolve with false to indicate volume wasn't set
        resolver(false)
      }
    }
  }
  
  // Keep restore the same
  @objc
  func restoreOriginalVolume(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        volumeSlider.value = self.originalVolume
        print("✅ Volume restored to: \(self.originalVolume)")
        resolver(true)
      } else {
        print("⚠️ Could not find volume slider for restoration - this is normal on app startup")
        // Don't throw an error, just resolve with false to indicate volume wasn't restored
        resolver(false)
      }
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 