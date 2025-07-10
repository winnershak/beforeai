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
      // DON'T save original volume here anymore!
      
      // Create hidden volume view if needed
      if self.volumeView == nil {
        self.volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
        if let volumeView = self.volumeView, 
           let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
          window.addSubview(volumeView)
        }
      }
      
      // Set volume to max
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        volumeSlider.value = volume.floatValue
        print("🔊 Set volume to: \(volume.floatValue) (original saved as: \(self.originalVolume))")
        resolver(true)
      } else {
        rejecter("error", "Could not find volume slider", nil)
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
        print("❌ Could not find volume slider for restoration")
        rejecter("error", "Could not find volume slider", nil)
      }
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 