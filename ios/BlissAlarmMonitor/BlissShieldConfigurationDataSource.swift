//
//  BlissShieldConfigurationDataSource.swift
//  BlissAlarmShieldExtension
//
//  Created by Yerassyl Shakhmardanov on 4/6/25.
//

import DeviceActivity
import ManagedSettings
import ManagedSettingsUI
import SwiftUI

// This is the main extension class that handles monitoring device activity
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        
        print("📱 Device activity interval started for \(activity)")
        
        // Apply shields when the interval starts
        let store = ManagedSettingsStore()
        
        // The shield configuration will be automatically picked up from the
        // BlissShieldConfigurationDataSource class in this extension
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        print("📱 Device activity interval ended for \(activity)")
        
        // Remove shields when the interval ends
        let store = ManagedSettingsStore()
        store.shield.applicationCategories = nil
        store.shield.applications = nil
        store.shield.webDomains = nil
    }
}

// This is the custom shield configuration class that defines how blocked apps appear
class BlissShieldConfigurationDataSource: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        // Get app name for more personalized message
        let appName = application.localizedDisplayName ?? "This app"
        
        // Create Label objects for text elements
        let titleLabel = ShieldConfiguration.Label(text: "Blocked by BlissAlarm", color: .white)
        let subtitleLabel = ShieldConfiguration.Label(text: "Enjoy restful sleep.\n\(appName) is blocked to help you sleep better.", color: .white)
        let buttonLabel = ShieldConfiguration.Label(text: "Alright, going to sleep", color: .white)
        
        return ShieldConfiguration(
            backgroundColor: UIColor.black,
            title: titleLabel,
            subtitle: subtitleLabel,
            primaryButtonLabel: buttonLabel,
            primaryButtonBackgroundColor: UIColor.systemRed
        )
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        let domainName = webDomain.domain ?? "This website"
        
        // Create Label objects for text elements
        let titleLabel = ShieldConfiguration.Label(text: "Blocked by BlissAlarm", color: .white)
        let subtitleLabel = ShieldConfiguration.Label(text: "Enjoy restful sleep.\n\(domainName) is blocked to help you sleep better.", color: .white)
        let buttonLabel = ShieldConfiguration.Label(text: "Alright, going to sleep", color: .white)
        
        return ShieldConfiguration(
            backgroundColor: UIColor.black,
            title: titleLabel,
            subtitle: subtitleLabel,
            primaryButtonLabel: buttonLabel,
            primaryButtonBackgroundColor: UIColor.systemRed
        )
    }
}
