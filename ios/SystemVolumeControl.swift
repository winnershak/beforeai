import Foundation
import MediaPlayer
import AVFoundation

@objc(SystemVolumeControl)
class SystemVolumeControl: NSObject {
  private var volumeView: MPVolumeView?
  private var originalVolume: Float = 0.5
  
  @objc
  func setSystemVolume(_ volume: Float, 
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Store original volume to restore later if needed
      self.originalVolume = AVAudioSession.sharedInstance().outputVolume
      
      // Create hidden volume view if needed
      if self.volumeView == nil {
        self.volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
        if let volumeView = self.volumeView, 
           let window = UIApplication.shared.windows.first {
          window.addSubview(volumeView)
        }
      }
      
      // Find the slider in the volume view
      if let volumeView = self.volumeView,
         let volumeSlider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        // Set the volume
        volumeSlider.value = volume
        resolver(true)
      } else {
        rejecter("error", "Could not find volume slider", nil)
      }
    }
  }
  
  @objc
  func restoreOriginalVolume(_ resolver: @escaping RCTPromiseResolveBlock,
                             rejecter: @escaping RCTPromiseRejectBlock) {
    self.setSystemVolume(self.originalVolume, resolver: resolver, rejecter: rejecter)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 