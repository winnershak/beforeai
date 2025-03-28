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
    // Capture resolver and rejecter before async block to avoid escaping issues
    let capturedResolver = resolver
    let capturedRejecter = rejecter
    
    DispatchQueue.main.async {
      do {
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

        // Maximum volume for alarm
        player.volume = 1.0
        
        // Make sure the player is prepared before playing
        if !player.prepareToPlay() {
          throw NSError(domain: "AlarmError", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare audio player"])
        }
        
        player.numberOfLoops = -1
        player.play()

        capturedResolver(true)
        print("✅ Alarm sound playing: \(soundName).caf")
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
      // Cancel any timers
      self.timer?.invalidate()
      self.timer = nil
      
      // Stop playback
      self.audioPlayer?.stop()
      self.audioPlayer = nil
      
      do {
        capturedResolver(true)
        print("✅ Alarm sound stopped, keeping audio session active.")
      } catch {
        capturedRejecter("error", "Audio session deactivate failed: \(error.localizedDescription)", error)
        print("❌ Audio session deactivate failed: \(error.localizedDescription)")
      }
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
} 