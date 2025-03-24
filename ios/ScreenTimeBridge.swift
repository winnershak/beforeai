import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import React

// Add this class to handle the device activity events
@available(iOS 15.0, *)
class AppBlockMonitor: DeviceActivityMonitor {
  private var scheduleId: String
  
  init(scheduleId: String) {
    self.scheduleId = scheduleId
    super.init()
  }
  
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    
    // Apply the shields when the interval starts
    if let selection = ScreenTimeBridge.shared.getActivitySelection() {
      let store = ManagedSettingsStore()
      
      if !selection.categoryTokens.isEmpty {
        if #available(iOS 16.0, *) {
          // For iOS 16+, use .all() when categories are selected
          store.shield.applicationCategories = .all()
        } else {
          // For iOS 15, use .specific
          store.shield.applicationCategories = .specific(selection.categoryTokens)
        }
      }
      
      if !selection.applicationTokens.isEmpty {
        store.shield.applications = selection.applicationTokens
      }
      
      if !selection.webDomainTokens.isEmpty {
        store.shield.webDomains = selection.webDomainTokens
      }
    }
  }
  
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    
    // Remove the shields when the interval ends
    let store = ManagedSettingsStore()
    store.shield.applicationCategories = nil
    store.shield.applications = nil
    store.shield.webDomains = nil
  }
}

@objc(ScreenTimeBridge)
class ScreenTimeBridge: NSObject {
  
  // Add a shared instance for the monitor to access
  static let shared = ScreenTimeBridge()
  
  private var activitySelection: FamilyActivitySelection?
  private var pickerHostingController: UIViewController?
  private var currentResolve: RCTPromiseResolveBlock?
  private var monitors: [String: AppBlockMonitor] = [:]
  private var savedApplicationTokens = Set<ManagedSettings.ApplicationToken>()
  private var savedCategoryTokens = Set<ManagedSettings.ActivityCategoryToken>()
  private var savedWebDomainTokens = Set<ManagedSettings.WebDomainToken>()
  
  // Method to get the activity selection for the monitor
  func getActivitySelection() -> FamilyActivitySelection? {
    return activitySelection
  }
  
  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Add a small delay to ensure the app is fully mounted
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let _ = self else { return }
      
      if #available(iOS 16.0, *) {
        // Capture the blocks explicitly
        let capturedResolve = resolve
        let capturedReject = reject
        
        Task {
          do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            DispatchQueue.main.async {
              capturedResolve(true)
            }
          } catch {
            DispatchQueue.main.async {
              capturedReject("authorization_error", "Failed to request authorization: \(error.localizedDescription)", error as NSError)
            }
          }
        }
      } else if #available(iOS 15.0, *) {
        // Capture the blocks explicitly for iOS 15
        let capturedResolve = resolve
        
        // iOS 15 version - uses completion handler (removed capturedReject from capture list)
        AuthorizationCenter.shared.requestAuthorization { [capturedResolve] result in
          switch result {
          case .success():
            DispatchQueue.main.async {
              capturedResolve(true)
            }
          case .failure(let error):
            DispatchQueue.main.async {
              // Instead of rejecting with an error, resolve with a structured response
              capturedResolve([
                "authorized": false,
                "error": error.localizedDescription,
                "errorCode": "passcode_required"
              ])
            }
          }
        }
      } else {
        reject("unsupported_version", "Screen Time API requires iOS 15.0 or later", nil as NSError?)
      }
    }
  }
  
  @objc
  func showAppSelectionPicker(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Ensure we're on the main thread for all UI operations
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        reject("error", "Self reference lost", nil)
        return
      }
      
      if #available(iOS 15.0, *) {
        // Store the resolve callback for later use
        self.currentResolve = resolve
        
        // Create a simple wrapper view
        class PickerWrapperViewController: UIViewController {
          var selection = FamilyActivitySelection()
          var onDone: ((FamilyActivitySelection) -> Void)?
          
          override func viewDidLoad() {
            super.viewDidLoad()
            
            // Set up the navigation bar
            title = "Select Apps"
            navigationItem.rightBarButtonItem = UIBarButtonItem(
              barButtonSystemItem: .done,
              target: self,
              action: #selector(donePressed)
            )
            
            // Create the SwiftUI picker view
            let picker = UIHostingController(
              rootView: FamilyActivityPicker(selection: Binding(
                get: { self.selection },
                set: { self.selection = $0 }
              ))
            )
            
            // Add the picker as a child view controller
            addChild(picker)
            view.addSubview(picker.view)
            picker.view.frame = view.bounds
            picker.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            picker.didMove(toParent: self)
          }
          
          @objc func donePressed() {
            onDone?(selection)
          }
        }
        
        // Create the wrapper view controller
        let wrapper = PickerWrapperViewController()
        
        // Initialize with previously saved selections
        if !self.savedApplicationTokens.isEmpty {
          wrapper.selection.applicationTokens = self.savedApplicationTokens
        }
        if !self.savedCategoryTokens.isEmpty {
          wrapper.selection.categoryTokens = self.savedCategoryTokens
        }
        if !self.savedWebDomainTokens.isEmpty {
          wrapper.selection.webDomainTokens = self.savedWebDomainTokens
        }
        
        wrapper.onDone = { [weak self] selection in
          guard let self = self else { return }
          
          // Store the selection
          self.activitySelection = selection
          
          // Save the tokens for future use
          self.savedApplicationTokens = selection.applicationTokens
          self.savedCategoryTokens = selection.categoryTokens
          self.savedWebDomainTokens = selection.webDomainTokens
          
          // Process the selection
          var selectedApps: [String] = []
          var selectedCategories: [String] = []
          var selectedWebDomains: [String] = []
          
          // Handle application tokens
          for token in selection.applicationTokens {
            let appId = String(describing: token)
            selectedApps.append(appId)
            print("📱 Selected app: \(appId)")
          }
          
          // Handle category tokens
          for token in selection.categoryTokens {
            let categoryId = String(describing: token)
            selectedCategories.append(categoryId)
            print("🔖 Selected category: \(categoryId)")
          }
          
          // Handle web domain tokens
          for token in selection.webDomainTokens {
            let domainId = String(describing: token)
            selectedWebDomains.append(domainId)
            print("🌐 Selected web domain: \(domainId)")
          }
          
          // Dismiss the picker
          wrapper.dismiss(animated: true) {
            // Send the result back to React Native
            if let resolve = self.currentResolve {
              print("✅ Resolving picker with selection data: apps=\(selectedApps.count), categories=\(selectedCategories.count), domains=\(selectedWebDomains.count)")
              resolve([
                "apps": selectedApps,
                "categories": selectedCategories,
                "webDomains": selectedWebDomains
              ])
              self.currentResolve = nil
            }
          }
        }
        
        // Create a navigation controller
        let navigationController = UINavigationController(rootViewController: wrapper)
        
        // Store the controller for later access
        self.pickerHostingController = navigationController
        
        // Present the controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
          rootVC.present(navigationController, animated: true)
        }
      } else {
        reject("unsupported_version", "FamilyActivityPicker requires iOS 15.0 or later", nil as NSError?)
      }
    }
  }
  
  @objc
  func applyAppBlockSchedule(_ scheduleData: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      guard let id = scheduleData["id"] as? String,
            let startTimeString = scheduleData["startTime"] as? String,
            let endTimeString = scheduleData["endTime"] as? String,
            let _ = scheduleData["daysOfWeek"] as? [Bool],
            let isActive = scheduleData["isActive"] as? Bool else {
        reject("invalid_data", "Invalid schedule data provided", nil)
        return
      }
      
      // Only proceed if the schedule is active
      if !isActive {
        // Remove any existing schedule with this ID
        let center = DeviceActivityCenter()
        center.stopMonitoring([DeviceActivityName(id)])
        
        // Remove any active shields
        let store = ManagedSettingsStore()
        store.shield.applicationCategories = nil
        store.shield.applications = nil
        store.shield.webDomains = nil
        
        resolve(true)
        return
      }
      
      // Create a DateComponents for the start time
      let dateFormatter = ISO8601DateFormatter()
      dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      
      guard let startDate = dateFormatter.date(from: startTimeString),
            let endDate = dateFormatter.date(from: endTimeString) else {
        print("Failed to parse dates: \(startTimeString), \(endTimeString)")
        reject("invalid_date", "Invalid date format", nil)
        return
      }
      
      let calendar = Calendar.current
      let startComponents = calendar.dateComponents([.hour, .minute], from: startDate)
      let endComponents = calendar.dateComponents([.hour, .minute], from: endDate)
      
      // Create a schedule
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: startComponents.hour, minute: startComponents.minute),
        intervalEnd: DateComponents(hour: endComponents.hour, minute: endComponents.minute),
        repeats: true
      )
      
      // Get the blocked items from the schedule data
      let blockedApps = scheduleData["blockedApps"] as? [String] ?? []
      let blockedCategories = scheduleData["blockedCategories"] as? [String] ?? []
      let blockedWebDomains = scheduleData["blockedWebDomains"] as? [String] ?? []
      
      print("📊 Schedule data contains: \(blockedApps.count) apps, \(blockedCategories.count) categories, \(blockedWebDomains.count) domains")
      
      // Print the counts for debugging
      print("📱 Blocked apps count: \(blockedApps.count)")
      print("📱 Blocked categories count: \(blockedCategories.count)")
      print("📱 Blocked web domains count: \(blockedWebDomains.count)")
      
      // We'll use the stored selection from the picker instead of trying to recreate it
      
      // Check if we have a stored selection
      if let storedSelection = self.activitySelection {
        print("✅ Using selection with \(storedSelection.applicationTokens.count) apps, \(storedSelection.categoryTokens.count) categories, \(storedSelection.webDomainTokens.count) domains")
        
        // Create a monitor for this schedule
        let activityName = DeviceActivityName(id)
        let center = DeviceActivityCenter()
        
        // Create and store the monitor
        let monitor = AppBlockMonitor(scheduleId: id)
        monitors[id] = monitor
        
        if storedSelection.applicationTokens.isEmpty && storedSelection.categoryTokens.isEmpty && storedSelection.webDomainTokens.isEmpty {
          print("⚠️ Selection is empty")
          resolve([
            "success": false,
            "error": "No apps or categories selected to block. Please select apps first."
          ])
          return
        }
        
        do {
          // Start monitoring
          try center.startMonitoring(
            activityName,
            during: schedule
          )
          
          // Apply the restrictions immediately if within the time window
          let now = Date()
          let nowComponents = calendar.dateComponents([.hour, .minute], from: now)
          let nowHour = nowComponents.hour ?? 0
          let nowMinute = nowComponents.minute ?? 0
          let startHour = startComponents.hour ?? 0
          let startMinute = startComponents.minute ?? 0
          let endHour = endComponents.hour ?? 0
          let endMinute = endComponents.minute ?? 0
          
          let isWithinTimeWindow = (nowHour > startHour || (nowHour == startHour && nowMinute >= startMinute)) &&
                                 (nowHour < endHour || (nowHour == endHour && nowMinute <= endMinute))
          
          if isWithinTimeWindow {
            let store = ManagedSettingsStore()
            
            if !storedSelection.categoryTokens.isEmpty {
              // Always use .specific with the category tokens
              store.shield.applicationCategories = .specific(storedSelection.categoryTokens)
            }
            
            if !storedSelection.applicationTokens.isEmpty {
              store.shield.applications = storedSelection.applicationTokens
            }
            
            if !storedSelection.webDomainTokens.isEmpty {
              store.shield.webDomains = storedSelection.webDomainTokens
            }
          }
          
          resolve(true)
        } catch {
          reject("monitoring_error", "Failed to start monitoring: \(error.localizedDescription)", error as NSError)
        }
      } else {
        // No stored selection, prompt the user to select apps first
        print("No stored selection available")
        resolve([
          "success": false,
          "error": "No app selection available. Please select apps to block first."
        ])
      }
    } else if #available(iOS 15.0, *) {
      // iOS 15 implementation (more limited)
      guard let _ = scheduleData["id"] as? String,
            let isActive = scheduleData["isActive"] as? Bool else {
        reject("invalid_data", "Invalid schedule data provided", nil)
        return
      }
      
      // Get the blocked items from the schedule data
      let blockedApps = scheduleData["blockedApps"] as? [String] ?? []
      let blockedCategories = scheduleData["blockedCategories"] as? [String] ?? []
      let blockedWebDomains = scheduleData["blockedWebDomains"] as? [String] ?? []
      
      // For iOS 15, we can only do basic functionality
      if let storedSelection = self.activitySelection {
        let store = ManagedSettingsStore()
        
        if isActive {
          // Apply restrictions immediately
          if !storedSelection.categoryTokens.isEmpty {
            store.shield.applicationCategories = .specific(storedSelection.categoryTokens)
          }
          
          if !storedSelection.applicationTokens.isEmpty {
            store.shield.applications = storedSelection.applicationTokens
          }
          
          if !storedSelection.webDomainTokens.isEmpty {
            store.shield.webDomains = storedSelection.webDomainTokens
          }
        } else {
          // Remove restrictions
          store.shield.applicationCategories = nil
          store.shield.applications = nil
          store.shield.webDomains = nil
        }
        
        resolve(true)
      } else {
        resolve([
          "success": false,
          "error": "No app selection available. Please select apps to block first."
        ])
      }
    } else {
      reject("unsupported_version", "App blocking requires iOS 15.0 or later", nil)
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 
