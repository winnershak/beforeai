import Foundation
import AVFoundation
import UserNotifications

// Add these type definitions at the top
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void

@objc(AlarmSound)
class AlarmSound: NSObject {
  var audioPlayer: AVAudioPlayer?
  var timer: Timer?
  var maxVolume: Float = 1.0
  var volumeStep: Float = 0.05
  var volumeIncreaseInterval: TimeInterval = 1.0  // Increase volume every 1 second
  
  // Reference to volume control
  private let volumeControl = SystemVolumeControl()
  
  @objc
  func configureAudio() {
    // Set the AVAudioSession once at app startup
    do {
      try AVAudioSession.sharedInstance().setCategory(
        .playback, 
        mode: .default, 
        options: [.mixWithOthers, .duckOthers]
      )
      try AVAudioSession.sharedInstance().setActive(true)
      print("✅ Audio session configured for silent-mode playback.")
    } catch {
      print("❌ Failed to configure audio session: \(error)")
    }
    
    // ENHANCED DEBUGGING: Print everything in the app bundle
    if let resourcePath = Bundle.main.resourcePath {
      let fileManager = FileManager.default
      print("📁 Looking for sound files in: \(resourcePath)")
      do {
        let files = try fileManager.contentsOfDirectory(atPath: resourcePath)
        print("📦 Total files in bundle: \(files.count)")
        
        // Print ALL files for debugging (not just filtering for sounds)
        print("📋 Complete file list:")
        for file in files {
          print("- \(file)")
        }
        
        // Also search in specific subdirectories that might contain sounds
        let possibleSoundDirs = ["sounds", "Sounds", "audio", "Audio", "assets", "Assets"]
        for dir in possibleSoundDirs {
          let dirPath = resourcePath + "/" + dir
          if fileManager.fileExists(atPath: dirPath) {
            print("📂 Checking directory: \(dirPath)")
            if let dirContents = try? fileManager.contentsOfDirectory(atPath: dirPath) {
              print("   Found \(dirContents.count) files:")
              for file in dirContents {
                print("   - \(file)")
              }
            }
          }
        }
        
        // Now filter just for sound files
        let soundFiles = files.filter({ $0.hasSuffix(".caf") || $0.hasSuffix(".mp3") })
        print("🔊 Found \(soundFiles.count) sound files:")
        for file in soundFiles {
          print("🔊 Sound file: \(file)")
        }
        
        // Also look in the main bundle's URLs
        if let cafUrls = Bundle.main.urls(forResourcesWithExtension: "caf", subdirectory: nil) {
          print("🔍 Found \(cafUrls.count) .caf files via urls(forResourcesWithExtension:)")
          for url in cafUrls {
            print("   - \(url.lastPathComponent)")
          }
        } else {
          print("❌ No .caf files found via urls(forResourcesWithExtension:)")
        }
        
        // Try looking for specific sound files by name
        let testSounds = ["radar", "beacon", "chimes"]
        for sound in testSounds {
          if let soundPath = Bundle.main.path(forResource: sound, ofType: "caf") {
            print("✅ Found sound file: \(sound).caf at \(soundPath)")
          } else {
            print("❌ Could NOT find sound: \(sound).caf")
          }
        }
      } catch {
        print("❌ Error listing files: \(error)")
      }
    }
  }
  
  @objc
  func playAlarmSound(_ soundName: String, volume: Float, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // If sound is already playing, stop it first
    if audioPlayer != nil {
      audioPlayer?.stop()
      audioPlayer = nil
    }
    
    // Capture resolver and rejecter before async block to avoid escaping issues
    let capturedResolver = resolver
    let capturedRejecter = rejecter
    
    DispatchQueue.main.async {
      do {
        // Set system volume to maximum for alarms
        self.volumeControl.setSystemVolume(NSNumber(value: 1.0), 
                                         resolver: { _ in print("🔊 System volume set to maximum") },
                                         rejecter: { _, _, _ in print("❌ Failed to set system volume") })
        
        // CRITICAL FIX: Don't change the audio session at all!
        // Use the existing audio session created by the silent background player
        print("🔊 Using existing audio session from background player")

        // Maintain case-insensitive file lookup
        let normalizedSoundName = soundName.lowercased()
        var soundURL: URL?
        
        // Try these in order: exact name, lowercase, capitalized
        for name in [soundName, normalizedSoundName, normalizedSoundName.capitalized] {
          if let url = Bundle.main.url(forResource: name, withExtension: "caf") {
            soundURL = url
            print("✅ Found sound file using name: \(name)")
            break
          }
        }
        
        guard let soundURL = soundURL else {
          capturedRejecter("error", "Sound file \(soundName).caf not found", nil)
          return
        }

        self.audioPlayer = try AVAudioPlayer(contentsOf: soundURL)
        guard let player = self.audioPlayer else {
          throw NSError(domain: "AlarmError", code: 3, userInfo: [NSLocalizedDescriptionKey: "AVAudioPlayer init failed"])
        }

        // Set maximum volume for alarm - CHANGED FROM 1.0 to user's volume setting
        // But ensure it's at least 0.7 for production builds to be audible
        let minVolume: Float = 0.7
        player.volume = max(volume, minVolume)
        
        // Make sure the player is prepared before playing
        if !player.prepareToPlay() {
          throw NSError(domain: "AlarmError", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare audio player"])
        }
        
        player.numberOfLoops = -1
        player.play()
        
        // Start the volume ramp-up to ensure it gets louder
        self.maxVolume = 1.0  // Always ramp up to maximum
        self.startVolumeRampUp()

        capturedResolver(true)
        print("✅ Alarm sound playing: \(soundName).caf at volume \(player.volume)")
      } catch {
        capturedRejecter("error", "Playback failed: \(error.localizedDescription)", error)
        print("❌ Playback failed: \(error.localizedDescription)")
      }
    }
  }
  
  @objc
  func stopAlarmSound(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // Capture resolver and rejecter before async block to avoid escaping issues
    let capturedResolver = resolver
    let capturedRejecter = rejecter
    
    DispatchQueue.main.async {
      // Restore original system volume
      self.volumeControl.restoreOriginalVolume(
        { _ in print("🔊 Original system volume restored") },
        rejecter: { _, _, _ in print("❌ Failed to restore system volume") }
      )
      
      // Cancel any timers
      self.timer?.invalidate()
      self.timer = nil
      
      // Stop playback
      self.audioPlayer?.stop()
      self.audioPlayer = nil
      
      capturedResolver(true)
      print("✅ Alarm sound stopped, keeping audio session active.")
    }
  }
  
  func startVolumeRampUp() {
    // Cancel any existing timer
    timer?.invalidate()
    
    timer = Timer.scheduledTimer(
      withTimeInterval: volumeIncreaseInterval,
      repeats: true
    ) { [weak self] _ in
      guard let self = self, let player = self.audioPlayer else {
        self?.timer?.invalidate()
        return
      }

      let newVolume = min(player.volume + self.volumeStep, self.maxVolume)
      player.setVolume(newVolume, fadeDuration: self.volumeIncreaseInterval * 0.8)
      print("🔊 Increasing volume to: \(newVolume)")

      if newVolume >= self.maxVolume {
        self.timer?.invalidate()
        print("✅ Maximum volume reached.")
      }
    }
  }
  
  @objc
  func debugSoundFiles(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    var result: [String: Any] = [:]
    // var filesFound: [String] = []  // Removed unused variable
    var directories: [String: [String]] = [:]
    
    if let resourcePath = Bundle.main.resourcePath {
      // Check main bundle directory
      do {
        let fileManager = FileManager.default
        let files = try fileManager.contentsOfDirectory(atPath: resourcePath)
        result["totalFilesCount"] = files.count
        
        // Get sound files
        let soundFiles = files.filter { $0.hasSuffix(".caf") || $0.hasSuffix(".mp3") }
        result["soundFilesCount"] = soundFiles.count
        result["soundFiles"] = soundFiles
        
        // Check subdirectories
        let possibleSoundDirs = ["sounds", "Sounds", "audio", "Audio", "assets", "Assets"]
        for dir in possibleSoundDirs {
          let dirPath = resourcePath + "/" + dir
          if fileManager.fileExists(atPath: dirPath) {
            if let dirContents = try? fileManager.contentsOfDirectory(atPath: dirPath) {
              directories[dir] = dirContents
            }
          }
        }
        
        // Test specific sound files
        let testResults: [String: Bool] = [
          "radar.caf": Bundle.main.path(forResource: "radar", ofType: "caf") != nil,
          "beacon.caf": Bundle.main.path(forResource: "beacon", ofType: "caf") != nil,
          "chimes.caf": Bundle.main.path(forResource: "chimes", ofType: "caf") != nil,
          "circuit.caf": Bundle.main.path(forResource: "circuit", ofType: "caf") != nil
        ]
        
        result["specificSoundTests"] = testResults
        
        // Try to use the resource extension API
        if let cafUrls = Bundle.main.urls(forResourcesWithExtension: "caf", subdirectory: nil) {
          result["resourceAPIFound"] = cafUrls.count
          result["resourceAPIFiles"] = cafUrls.map { $0.lastPathComponent }
        } else {
          result["resourceAPIFound"] = 0
        }
      } catch {
        result["error"] = error.localizedDescription
      }
    }
    
    result["directories"] = directories
    
    resolver(result)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func preloadSoundAssets(_ soundUrls: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // PRODUCTION SAFETY: Don't download sounds at startup in production
    #if RELEASE
      print("Production build: Bypassing sound downloads for stability")
      resolver(true)
      return
    #endif
    
    // Original preloading code for development
    // ...rest of your method...
  }
  
  @objc
  func cleanup() {
    // Stop any playing audio
    if let audioPlayer = self.audioPlayer {
      audioPlayer.stop()
      self.audioPlayer = nil
    }
    
    // Release any audio session
    do {
      try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      print("Failed to deactivate audio session: \(error)")
    }
  }
  
  @objc
  func isPlayingAlarmSound(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    resolver(audioPlayer != nil && audioPlayer!.isPlaying)
  }
} 