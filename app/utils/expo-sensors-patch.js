// Complete replacement for expo-sensors without importing from expo-sensors
// This avoids the circular dependency

// Create a basic Accelerometer implementation
const Accelerometer = {
  isAvailableAsync: async () => true,
  
  setUpdateInterval: (interval) => {
    // Just store the interval value
    Accelerometer._interval = interval;
  },
  
  addListener: (callback) => {
    // Create a simple timer that simulates accelerometer data
    Accelerometer._timerId = setInterval(() => {
      // Generate random acceleration values
      const x = (Math.random() * 2) - 1;
      const y = (Math.random() * 2) - 1;
      const z = (Math.random() * 2) - 1;
      
      // Call the callback with the data
      callback({ x, y, z });
    }, Accelerometer._interval || 100);
    
    // Return a subscription object
    return {
      remove: () => {
        if (Accelerometer._timerId) {
          clearInterval(Accelerometer._timerId);
          Accelerometer._timerId = null;
        }
      }
    };
  },
  
  removeAllListeners: () => {
    if (Accelerometer._timerId) {
      clearInterval(Accelerometer._timerId);
      Accelerometer._timerId = null;
    }
  },
  
  // Internal properties
  _interval: 100,
  _timerId: null
};

// Create a mock Pedometer that uses our fake Accelerometer
const Pedometer = {
  isAvailableAsync: async () => true,
  
  getStepCountAsync: async (start, end) => {
    return { steps: 0 };
  },
  
  watchStepCount: (callback) => {
    // Use our fake accelerometer as a substitute
    let stepCount = 0;
    let lastMagnitude = 0;
    let isStepCounting = false;
    
    const subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      // Simple step detection algorithm
      const delta = Math.abs(magnitude - lastMagnitude);
      
      if (delta > 0.5 && !isStepCounting) {
        stepCount++;
        isStepCounting = true;
        
        // Call the callback with the updated step count
        callback({ steps: stepCount });
        
        // Reset the step counting flag after a delay
        setTimeout(() => {
          isStepCounting = false;
        }, 300);
      }
      
      lastMagnitude = magnitude;
    });
    
    // Return an object with a remove method
    return {
      remove: () => {
        if (subscription) {
          subscription.remove();
        }
      }
    };
  }
};

// Create empty mocks for other sensors
const Gyroscope = {
  isAvailableAsync: async () => false,
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {}
};

const Magnetometer = {
  isAvailableAsync: async () => false,
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {}
};

const DeviceMotion = {
  isAvailableAsync: async () => false,
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {}
};

const LightSensor = {
  isAvailableAsync: async () => false,
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {}
};

// Export our custom implementations
export { 
  Accelerometer, 
  Gyroscope, 
  Magnetometer, 
  DeviceMotion, 
  LightSensor,
  Pedometer 
};

// Also export as default for module replacement
const ExpoSensors = {
  Accelerometer, 
  Gyroscope, 
  Magnetometer, 
  DeviceMotion, 
  LightSensor,
  Pedometer
};

export default ExpoSensors; 