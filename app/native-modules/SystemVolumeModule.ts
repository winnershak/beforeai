import { NativeModules, Platform } from 'react-native';

const { SystemVolumeControl } = NativeModules;

interface SystemVolumeInterface {
  setSystemVolume(volume: number): Promise<boolean>;
  restoreOriginalVolume(): Promise<boolean>;
}

// Create a default implementation for non-iOS platforms
const SystemVolumeDefault: SystemVolumeInterface = {
  setSystemVolume: () => Promise.resolve(false),
  restoreOriginalVolume: () => Promise.resolve(false),
};

// Export the native module on iOS, or the default implementation on other platforms
const SystemVolumeModule: SystemVolumeInterface = 
  Platform.OS === 'ios' ? SystemVolumeControl : SystemVolumeDefault;

export default SystemVolumeModule; 