import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import React
import ManagedSettingsUI
import BackgroundTasks
import UserNotifications

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
  private var snoozedSchedules: [String: [String: Any]] = [:]
  private var snoozeTimers: [String: Timer] = [:]
  private var scheduleSelections: [String: FamilyActivitySelection] = [:]
  
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
  func showAppSelectionPicker(_ scheduleId: NSString, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Add a small delay to ensure the app is fully mounted
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self = self else { return }
      
      // iOS 16+ app selection picker
      self.currentResolve = resolve
      
      let id = scheduleId as String
      print("📱 Showing app selection picker for schedule: \(id)")
      
      // Get the current selection for this schedule, or create a new one
      let currentSelection = self.scheduleSelections[id] ?? FamilyActivitySelection()
      print("📱 Retrieved selection for schedule \(id): \(currentSelection.applicationTokens.count) apps, \(currentSelection.categoryTokens.count) categories, \(currentSelection.webDomainTokens.count) web domains")
      
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
          // Record the selection for this specific schedule
          self.scheduleSelections[id] = selection
          
          // Also update the shared selection for backward compatibility
          self.activitySelection = selection
          
          // Save tokens for recovery if needed
          self.savedApplicationTokens = selection.applicationTokens
          self.savedCategoryTokens = selection.categoryTokens
          self.savedWebDomainTokens = selection.webDomainTokens
          
          print("📱 Selected for schedule \(id): \(selection.applicationTokens.count) applications, \(selection.categoryTokens.count) categories, \(selection.webDomainTokens.count) web domains")
          
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
          
          // Prepare result object
          let result: [String: Any] = [
            "scheduleId": id,
            "apps": selectedApps,
            "categories": selectedCategories,
            "webDomains": selectedWebDomains
          ]
          
          // Resolve with the selection data
          if let resolve = self.currentResolve {
            resolve(result)
            self.currentResolve = nil
          }
          
          self.pickerHostingController?.dismiss(animated: true, completion: nil)
          self.pickerHostingController = nil
        }
      )
      
      // Create a hosting controller for the SwiftUI view
      let hostingController = UIHostingController(rootView: pickerView)
      self.pickerHostingController = hostingController
      
      // Present the hosting controller
      DispatchQueue.main.async {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
          rootViewController.present(hostingController, animated: true, completion: nil)
        }
      }
    }
  }
  
  @objc
  func applyAppBlockSchedule(_ scheduleData: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // Extract schedule data
    guard let id = scheduleData["id"] as? String,
          let startTimeStr = scheduleData["startTime"] as? String,
          let endTimeStr = scheduleData["endTime"] as? String,
          let blockedApps = scheduleData["blockedApps"] as? [String],
          let blockedCategories = scheduleData["blockedCategories"] as? [String],
          let blockedWebDomains = scheduleData["blockedWebDomains"] as? [String],
          let daysOfWeek = scheduleData["daysOfWeek"] as? [Bool],
          let isActive = scheduleData["isActive"] as? Bool else {
      reject("invalid_data", "Invalid schedule data", nil)
      return
    }
    
    print("📅 Applying app block schedule: \(id)")
    print("⏰ Start time: \(startTimeStr), End time: \(endTimeStr)")
    print("📱 Blocked apps: \(blockedApps.count)")
    print("🔖 Blocked categories: \(blockedCategories.count)")
    print("🌐 Blocked web domains: \(blockedWebDomains.count)")
    print("📆 Days of week: \(daysOfWeek)")
    print("✅ Is active: \(isActive)")
    
    // Get the selection for this schedule
    let selection = self.scheduleSelections[id] ?? self.activitySelection ?? FamilyActivitySelection()
    
    // If not active, stop monitoring and remove shields
    if !isActive {
      print("🛑 Schedule is not active, stopping monitoring")
      let center = DeviceActivityCenter()
      let activityName = DeviceActivityName(id)
      center.stopMonitoring([activityName])
      
      // Remove shields
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      store.shield.webDomains = nil
      
      resolve(true)
      return
    }
    
    // Create a DateComponents for the start time
    let dateFormatter = ISO8601DateFormatter()
    dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    
    guard let startDate = dateFormatter.date(from: startTimeStr),
          let endDate = dateFormatter.date(from: endTimeStr) else {
      print("Failed to parse dates: \(startTimeStr), \(endTimeStr)")
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
    
    print("📊 Schedule data contains: \(blockedApps.count) apps, \(blockedCategories.count) categories, \(blockedWebDomains.count) domains")
    
    // Print the counts for debugging
    print("📱 Blocked apps count: \(blockedApps.count)")
    print("📱 Blocked categories count: \(blockedCategories.count)")
    print("📱 Blocked web domains count: \(blockedWebDomains.count)")
    
    // Check if we have a stored selection
    if !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty {
      print("✅ Using selection with \(selection.applicationTokens.count) apps, \(selection.categoryTokens.count) categories, \(selection.webDomainTokens.count) domains")
      
      // Use the stored selection for this schedule if available
      if let selection = self.scheduleSelections[id] {
        print("📱 Using stored selection for schedule \(id): \(selection.applicationTokens.count) apps, \(selection.categoryTokens.count) categories, \(selection.webDomainTokens.count) web domains")
        
        // Create a monitor for this schedule
        if #available(iOS 16.0, *) {
          let monitor = AppBlockMonitor(scheduleId: id)
          self.monitors[id] = monitor
          AppBlockMonitor.activeMonitors[id] = monitor
          
          // Define the missing variables
          let activityName = DeviceActivityName(id)
          let center = DeviceActivityCenter()
          
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
              
              if !blockedCategories.isEmpty {
                // Use the stored selection for this schedule
                store.shield.applicationCategories = .specific(selection.categoryTokens)
              }
              
              if !blockedApps.isEmpty {
                // Use the stored selection for this schedule
                store.shield.applications = selection.applicationTokens
              }
              
              if !blockedWebDomains.isEmpty {
                // Use the stored selection for this schedule
                store.shield.webDomains = selection.webDomainTokens
              }
            }
            
            resolve(true)
          } catch {
            print("❌ Monitoring error: \(error.localizedDescription)")
            reject("monitoring_error", "Failed to start monitoring: \(error.localizedDescription)", error as NSError)
          }
        }
      } else {
        // No stored selection, prompt the user to select apps first
        print("No stored selection available")
        resolve([
          "success": false,
          "error": "No app selection available. Please select apps to block first."
        ])
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
  func removeAllShields(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Remove all shields immediately
    let store = ManagedSettingsStore()
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
    print("🛡️ All shields removed")
    resolve(true)
  }
  
  @objc
  func stopMonitoringForSchedule(_ scheduleId: NSString, snoozeMinutes: NSNumber, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let id = scheduleId as String
    let minutes = snoozeMinutes.intValue
    print("🛑 Stopping monitoring for schedule: \(id) for \(minutes) minutes")
    
    // If minutes is 0, immediately reapply the schedule instead of snoozing
    if minutes == 0 {
      print("⏰ Immediately reapplying schedule: \(id)")
      reapplySchedule(id: id)
      resolve(true)
      return
    }
    
    // First, make sure we remove all shields immediately
    let store = ManagedSettingsStore()
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
    print("🛡️ All shields removed for snooze")
    
    // Stop monitoring for this specific schedule
    let center = DeviceActivityCenter()
    let activityName = DeviceActivityName(id)
    center.stopMonitoring([activityName])
    
    // Remove this monitor from active monitors
    if #available(iOS 16.0, *) {
      AppBlockMonitor.activeMonitors.removeValue(forKey: id)
    }
    
    // Store the schedule data for reapplying later
    if let savedSchedules = UserDefaults.standard.object(forKey: "appBlockSchedules") as? String,
       let data = savedSchedules.data(using: .utf8),
       let schedules = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]] {
      
      // Find the schedule with matching ID
      if let schedule = schedules.first(where: { ($0["id"] as? String) == id }) {
        // Store this schedule for reapplying later
        snoozedSchedules[id] = schedule
        
        // Cancel existing timer if any
        if snoozeTimers[id] != nil {
          snoozeTimers[id]?.invalidate()
          snoozeTimers.removeValue(forKey: id)
        }
        
        // Only set a timer if minutes > 0 (for "rest of day" we don't need a timer)
        if minutes > 0 {
          // Create a new timer - use RunLoop.main to ensure it works even when app is backgrounded
          let timer = Timer(timeInterval: TimeInterval(minutes * 60), repeats: false) { [weak self] _ in
            self?.reapplySchedule(id: id)
          }
          RunLoop.main.add(timer, forMode: .common)
          snoozeTimers[id] = timer
          
          print("⏰ Set timer to reapply schedule \(id) after \(minutes) minutes")
          
          // Also store the end time in UserDefaults as a backup
          let endTime = Date().addingTimeInterval(TimeInterval(minutes * 60))
          UserDefaults.standard.set(endTime.timeIntervalSince1970, forKey: "snoozeEndTime_\(id)")
          
          // Schedule a local notification as a backup reminder
          let content = UNMutableNotificationContent()
          content.title = "App Block Snooze Ending"
          content.body = "Your app block snooze is about to expire"
          content.sound = UNNotificationSound.default
          
          // Schedule notification for 1 minute before snooze ends
          let triggerTime = max(1, minutes * 60 - 60)
          let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(triggerTime), repeats: false)
          let request = UNNotificationRequest(identifier: "snooze-end-\(id)", content: content, trigger: trigger)
          
          UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Error scheduling snooze notification: \(error)")
            }
          }
        } else {
          print("⏰ No timer set for 'rest of day' snooze")
        }
      }
    }
    
    resolve(true)
  }
  
  // Improved reapplySchedule method
  private func reapplySchedule(id: String) {
    print("⏰ Reapplying schedule: \(id)")
    
    // First, check if we have the schedule data in memory
    if let schedule = snoozedSchedules[id] {
      applyScheduleFromMemory(id: id, schedule: schedule)
    } else {
      // If not in memory, try to load from UserDefaults
      loadAndApplyScheduleFromStorage(id: id)
    }
    
    // Clean up UserDefaults regardless
    UserDefaults.standard.removeObject(forKey: "snoozeEndTime_\(id)")
    
    // Also remove any app-wide snooze flags
    UserDefaults.standard.removeObject(forKey: "appBlockDisabledUntil")
  }
  
  // New helper method to load schedule from storage
  private func loadAndApplyScheduleFromStorage(id: String) {
    if let savedSchedules = UserDefaults.standard.object(forKey: "appBlockSchedules") as? String,
       let data = savedSchedules.data(using: .utf8),
       let schedules = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]],
       let schedule = schedules.first(where: { ($0["id"] as? String) == id }) {
      
      applyScheduleFromMemory(id: id, schedule: schedule)
    } else {
      print("❌ Could not find schedule data in storage for ID: \(id)")
    }
  }
  
  // New helper method to apply a schedule from memory
  private func applyScheduleFromMemory(id: String, schedule: [String: Any]) {
    // Convert schedule to the format expected by applyAppBlockSchedule
    let scheduleData: [String: Any] = [
      "id": id,
      "startTime": schedule["startTime"] as? String ?? "",
      "endTime": schedule["endTime"] as? String ?? "",
      "blockedApps": schedule["blockedApps"] as? [String] ?? [],
      "blockedCategories": schedule["blockedCategories"] as? [String] ?? [],
      "blockedWebDomains": schedule["blockedWebDomains"] as? [String] ?? [],
      "daysOfWeek": schedule["daysOfWeek"] as? [Bool] ?? [true, true, true, true, true, true, true],
      "isActive": true
    ]
    
    // Call applyAppBlockSchedule with this data
    self.applyAppBlockSchedule(scheduleData as NSDictionary, resolve: { _ in
      print("✅ Successfully reapplied schedule: \(id)")
      // Remove from snoozed schedules
      self.snoozedSchedules.removeValue(forKey: id)
    }, reject: { _, message, _ in
      print("❌ Failed to reapply schedule: \(message ?? "Unknown error")")
    })
  }
  
  // Add a method to check for expired snoozes on app launch
  @objc
  func checkForExpiredSnoozes(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("🔍 Checking for expired snoozes")
    
    // Get all keys that start with "snoozeEndTime_"
    let userDefaults = UserDefaults.standard
    let allKeys = userDefaults.dictionaryRepresentation().keys
    let snoozeKeys = allKeys.filter { $0.starts(with: "snoozeEndTime_") }
    
    let now = Date().timeIntervalSince1970
    var expiredSnoozes = 0
    
    for key in snoozeKeys {
      if let endTimeInterval = userDefaults.object(forKey: key) as? TimeInterval {
        // Extract schedule ID from the key
        let scheduleId = key.replacingOccurrences(of: "snoozeEndTime_", with: "")
        
        // Check if snooze has expired
        if endTimeInterval <= now {
          print("⏰ Found expired snooze for schedule: \(scheduleId)")
          expiredSnoozes += 1
          
          // Reapply this schedule
          reapplySchedule(id: scheduleId)
        } else {
          // Snooze still active, set a new timer for the remaining time
          let remainingSeconds = endTimeInterval - now
          print("⏰ Snooze still active for schedule: \(scheduleId), \(Int(remainingSeconds)) seconds remaining")
          
          // Cancel existing timer if any
          if snoozeTimers[scheduleId] != nil {
            snoozeTimers[scheduleId]?.invalidate()
            snoozeTimers.removeValue(forKey: scheduleId)
          }
          
          // Create a new timer
          let timer = Timer(timeInterval: remainingSeconds, repeats: false) { [weak self] _ in
            self?.reapplySchedule(id: scheduleId)
          }
          RunLoop.main.add(timer, forMode: .common)
          snoozeTimers[scheduleId] = timer
        }
      }
    }
    
    resolve(["expiredSnoozes": expiredSnoozes])
  }
  
  @objc
  func clearAllSelections(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    scheduleSelections.removeAll()
    activitySelection = nil
    savedApplicationTokens.removeAll()
    savedCategoryTokens.removeAll()
    savedWebDomainTokens.removeAll()
    
    print("🧹 Cleared all app selections")
    resolve(true)
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
