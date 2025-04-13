import { NativeModules, Platform } from 'react-native';

const { AlarmSound } = NativeModules;

interface AlarmSoundInterface {
  configureAudio(): void;
  playAlarmSound(soundName: string, volume: number): Promise<boolean>;
  stopAlarmSound(): Promise<boolean>;
  debugSoundFiles(): Promise<any>;
  cleanup?(): void;
  isPlayingAlarmSound(): Promise<boolean>;
}

// Create a default implementation for non-iOS platforms
const AlarmSoundDefault: AlarmSoundInterface = {
  configureAudio: () => console.log('configureAudio: Not implemented on this platform'),
  playAlarmSound: () => Promise.resolve(false),
  stopAlarmSound: () => Promise.resolve(false),
  debugSoundFiles: () => Promise.resolve({ error: 'Not implemented on this platform' }),
  isPlayingAlarmSound: () => Promise.resolve(false),
};

// Export the native module on iOS, or the default implementation on other platforms
const AlarmSoundModule: AlarmSoundInterface = Platform.OS === 'ios' ? AlarmSound : AlarmSoundDefault;

// Ensure the module is properly initialized
const AlarmSoundModuleSafe = {
  // Ensure proper initialization
  configureAudio: () => {
    if (Platform.OS === 'ios' && AlarmSound.configureAudio) {
      return AlarmSound.configureAudio();
    }
    return Promise.resolve(false);
  },

  playAlarmSound: (soundName: string, volume: number) => {
    if (Platform.OS === 'ios' && AlarmSound.playAlarmSound) {
      return AlarmSound.playAlarmSound(soundName, volume);
    }
    return Promise.reject(new Error('Native alarm sound module not available'));
  },

  stopAlarmSound: () => {
    if (Platform.OS === 'ios' && AlarmSound.stopAlarmSound) {
      return AlarmSound.stopAlarmSound();
    }
    return Promise.resolve(false);
  },

  cleanup: () => {
    if (Platform.OS === 'ios' && AlarmSound.cleanup) {
      return AlarmSound.cleanup();
    }
    return;
  },

  debugSoundFiles: () => AlarmSoundModule.debugSoundFiles(),

  isPlayingAlarmSound: () => AlarmSoundModule.isPlayingAlarmSound(),
};

export default AlarmSoundModuleSafe; 