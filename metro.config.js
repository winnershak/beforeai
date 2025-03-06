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

module.exports = config;
