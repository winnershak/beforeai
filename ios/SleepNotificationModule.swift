import Foundation
import UserNotifications

@objc(SleepNotificationModule)
class SleepNotificationModule: NSObject {
    
  @objc
  func scheduleSleepReminder(_ hour: Int, minute: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    
    let content = UNMutableNotificationContent()
    content.title = "🛌 Time to Sleep"
    content.body = "Put down your phone. You need rest."
    content.subtitle = "Sleep Reminder"
    content.sound = UNNotificationSound.default
    
    content.userInfo = [
      "notificationType": "sleepReminder",
      "targetScreen": "sleep-info"
    ]
    
    var dateComponents = DateComponents()
    dateComponents.hour = hour
    dateComponents.minute = minute
    
    let trigger = UNCalendarNotificationTrigger(
      dateMatching: dateComponents,
      repeats: true
    )
    
    let identifier = "SleepReminder"
    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: trigger
    )
    
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    
    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        rejecter("error", "Failed to schedule notification: \(error.localizedDescription)", error)
      } else {
        resolver(identifier)
      }
    }
  }
  
  @objc
  func cancelSleepReminder(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["SleepReminder"])
    resolver(true)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
} 
