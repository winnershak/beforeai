import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import React
import ManagedSettingsUI

// Add this class to handle the device activity events
@available(iOS 16.0, *)
class AppBlockMonitor: DeviceActivityMonitor {
  private var scheduleId: String
  // Create static dictionary to keep references to monitors
  static var activeMonitors = [String: AppBlockMonitor]()
  
  init(scheduleId: String) {
    self.scheduleId = scheduleId
    super.init()
    // Store self in static dictionary to prevent deallocation
    AppBlockMonitor.activeMonitors[scheduleId] = self
  }
  
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    print("📱 Device activity interval started for \(scheduleId)")
    // Apply the shields when the interval starts
    if let selection = ScreenTimeBridge.shared.getActivitySelection() {
      let store = ManagedSettingsStore()
      
      // Custom shield configuration is handled by the system automatically
      // when BlissShieldConfigurationDataSource is included in the target
      print("🛡️ Applying shields with custom configuration")
      
      if !selection.categoryTokens.isEmpty {
        print("🔖 Applying \(selection.categoryTokens.count) category shields")
        store.shield.applicationCategories = .all()
      }
      
      if !selection.applicationTokens.isEmpty {
        print("📱 Applying \(selection.applicationTokens.count) app shields")
        store.shield.applications = selection.applicationTokens
      }
      
      if !selection.webDomainTokens.isEmpty {
        print("🌐 Applying \(selection.webDomainTokens.count) web domain shields")
        store.shield.webDomains = selection.webDomainTokens
      }
    }
  }
  
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    
    print("📱 Device activity interval ended for \(scheduleId)")
    // Remove the shields when the interval ends
    let store = ManagedSettingsStore()
    store.shield.applicationCategories = nil
    store.shield.applications = nil
    store.shield.webDomains = nil
    
    // Remove self from active monitors dictionary
    AppBlockMonitor.activeMonitors.removeValue(forKey: scheduleId)
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
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      // Use Task for async context
      Task { @MainActor in
        let center = AuthorizationCenter.shared
        do {
          // Use the modern async/await version with individual access level
          try await center.requestAuthorization(for: .individual)
          print("✅ FamilyControls authorization approved!")
          resolve(true)
        } catch {
          print("⛔️ FamilyControls authorization error: \(error.localizedDescription)")
          resolve(false)
        }
      }
    }
  }
  
  @objc
  func showAppSelectionPicker(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Add a small delay to ensure the app is fully mounted
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self = self else { return }
      
      // iOS 16+ app selection picker
      self.currentResolve = resolve
      
      // Store the current selection
      let currentSelection = self.activitySelection ?? FamilyActivitySelection()
      
      // Create a SwiftUI view that will host our picker
      let pickerView = SelectionPickerView(
        initialSelection: currentSelection,
        onCancel: {
          // Handle cancel
          if let resolve = self.currentResolve {
            resolve([:])
            self.currentResolve = nil
          }
          
          self.pickerHostingController?.dismiss(animated: true, completion: nil)
          self.pickerHostingController = nil
        },
        onSelect: { selection in
          // Record the selection for later use
          self.activitySelection = selection
          
          // Save tokens for recovery if needed
          self.savedApplicationTokens = selection.applicationTokens
          self.savedCategoryTokens = selection.categoryTokens
          self.savedWebDomainTokens = selection.webDomainTokens
          
          print("📱 Selected \(selection.applicationTokens.count) applications, \(selection.categoryTokens.count) categories, \(selection.webDomainTokens.count) web domains")
          
          // Prepare data to send back to JS
          var selectedApps: [String] = []
          var selectedCategories: [String] = []
          var selectedWebDomains: [String] = []
          
          // Convert app tokens to strings
          for token in selection.applicationTokens {
            let appId = String(describing: token)
            selectedApps.append(appId)
            print("📱 Selected app: \(appId)")
          }
          
          // Convert category tokens to strings
          for token in selection.categoryTokens {
            let categoryId = String(describing: token)
            selectedCategories.append(categoryId)
            print("🔖 Selected category: \(categoryId)")
          }
          
          // Convert web domain tokens to strings
          for token in selection.webDomainTokens {
            let domainId = String(describing: token)
            selectedWebDomains.append(domainId)
            print("🌐 Selected web domain: \(domainId)")
          }
          
          // Dismiss the picker
          self.pickerHostingController?.dismiss(animated: true) {
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
      )
      
      // Create a hosting controller for our SwiftUI view
      let wrapper = UIHostingController(rootView: pickerView)
      
      // Create a navigation controller
      let navigationController = UINavigationController(rootViewController: wrapper)
      
      // Store the controller for later access
      self.pickerHostingController = navigationController
      
      // Present the controller
      if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let rootVC = windowScene.windows.first?.rootViewController {
        rootVC.present(navigationController, animated: true)
      }
    }
  }
  
  @objc
  func applyAppBlockSchedule(_ scheduleData: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let id = scheduleData["id"] as? String,
          let startTimeString = scheduleData["startTime"] as? String,
          let endTimeString = scheduleData["endTime"] as? String,
          let daysOfWeek = scheduleData["daysOfWeek"] as? [Bool],
          let _ = scheduleData["isActive"] as? Bool else {
      reject("invalid_data", "Invalid schedule data provided", nil)
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
        
        // Fix time window detection logic to handle overnight schedules properly
        var isWithinTimeWindow = false
        
        // Convert everything to minutes for easier comparison
        let nowMinutes = nowHour * 60 + nowMinute
        let startMinutes = startHour * 60 + startMinute
        let endMinutes = endHour * 60 + endMinute
        
        if (startMinutes < endMinutes) {
          // Normal schedule (e.g. 9:00 to 17:00)
          isWithinTimeWindow = nowMinutes >= startMinutes && nowMinutes <= endMinutes
        } else {
          // Overnight schedule (e.g. 22:00 to 7:00)
          isWithinTimeWindow = nowMinutes >= startMinutes || nowMinutes <= endMinutes
        }
        
        print("🕒 Current time: \(nowHour):\(nowMinute)")
        print("🕒 Start time: \(startHour):\(startMinute)")
        print("🕒 End time: \(endHour):\(endMinute)")
        print("🔍 Is within time window: \(isWithinTimeWindow)")
        
        // Check if today is a day when this schedule should be active
        let todayIndex = calendar.component(.weekday, from: now) - 1 // 0 = Sunday
        let isActiveToday = daysOfWeek.indices.contains(todayIndex) && daysOfWeek[todayIndex]
        print("📅 Today is day \(todayIndex), active: \(isActiveToday)")
        
        isWithinTimeWindow = isWithinTimeWindow && isActiveToday
        
        if isWithinTimeWindow {
          print("🔒 Applying shields immediately")
          let store = ManagedSettingsStore()
          
          // Custom shield configuration is handled by the system automatically
          // when BlissShieldConfigurationDataSource is included in the target
          print("🛡️ Applying shields with custom configuration")
          
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
        print("❌ Monitoring error: \(error.localizedDescription)")
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
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

// Add a SwiftUI view to host the FamilyActivityPicker
@available(iOS 16.0, *)
struct SelectionPickerView: View {
  @State private var selection: FamilyActivitySelection
  var onCancel: () -> Void
  var onSelect: (FamilyActivitySelection) -> Void
  
  init(initialSelection: FamilyActivitySelection, onCancel: @escaping () -> Void, onSelect: @escaping (FamilyActivitySelection) -> Void) {
    _selection = State(initialValue: initialSelection)
    self.onCancel = onCancel
    self.onSelect = onSelect
  }
  
  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Select Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              onCancel()
            }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              onSelect(selection)
            }
          }
        }
    }
  }
} 
