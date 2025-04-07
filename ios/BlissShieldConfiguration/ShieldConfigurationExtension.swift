//
//  ShieldConfigurationExtension.swift
//  BlissShieldConfiguration
//
//  Created by Yerassyl Shakhmardanov on 4/6/25.
//

import ManagedSettings
import ManagedSettingsUI
import UIKit



class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    
    // Shared config method
    func makeShieldConfig(title: String, subtitle: String) -> ShieldConfiguration {
        let backgroundColor = UIColor(red: 254/255, green: 247/255, blue: 203/255, alpha: 1.0) // #FEF7CB
        let textColor = UIColor(red: 40/255, green: 40/255, blue: 40/255, alpha: 1.0)          // #282828
        let buttonBackground = UIColor(red: 40/255, green: 39/255, blue: 101/255, alpha: 1.0)  // #282765
        let buttonText = UIColor.white                                                       // #FFFFFF

        return ShieldConfiguration(
            backgroundColor: backgroundColor,
            title: ShieldConfiguration.Label(text: title, color: textColor),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: textColor),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Sleep", color: buttonText),
            primaryButtonBackgroundColor: buttonBackground
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        let appName = application.localizedDisplayName ?? "This app"
        return makeShieldConfig(
            title: "🐰 BlissAlarm Sleep Time",
            subtitle: "Time to rest and recharge.\n\(appName) is paused until morning. 🐰"
        )
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        let domainName = webDomain.domain ?? "This website"
        return makeShieldConfig(
            title: "🐰 BlissAlarm Sleep Time",
            subtitle: "Time to rest and recharge.\n\(domainName) is paused until morning. 🐰"
        )
    }
}
