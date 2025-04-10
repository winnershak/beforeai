// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolution for problematic modules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'ExponentPedometer': __dirname + '/app/mock-modules/ExponentPedometer.js',
  // Add a direct replacement for expo-sensors
  'expo-sensors': __dirname + '/app/utils/expo-sensors-patch.js'
};

// Add a specific resolver for the problematic module
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

// Handle circular dependencies
config.resolver.blockList = [
  /node_modules\/expo-sensors\/.*/ // Block the original expo-sensors
];

// Fix for iOS 18 deep linking issues
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Fix URL handling for iOS
      if (req.url && req.url.includes('&platform=ios')) {
        req.url = req.url.replace('&platform=ios', '');
      }
      return middleware(req, res, next);
    };
  },
};

// Ensure proper handling of assets
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'caf'],
};

module.exports = config;