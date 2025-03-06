// Mock implementation for ExponentPedometer
const ExponentPedometer = {
  startObserving: () => {},
  stopObserving: () => {},
  setUpdateInterval: () => {},
  isAvailableAsync: () => Promise.resolve(false),
  getStepCountAsync: () => Promise.resolve({ steps: 0 }),
  watchStepCount: () => ({ remove: () => {} }),
};

// Export as both default and named export
module.exports = ExponentPedometer;
module.exports.default = ExponentPedometer; 