import { NativeModules, Platform } from 'react-native';

const { AlarmSound } = NativeModules;

interface AlarmSoundInterface {
  configureAudio(): void;
  playAlarmSound(soundName: string, volume: number): Promise<boolean>;
  stopAlarmSound(): Promise<boolean>;
  debugSoundFiles(): Promise<any>;
}

// Create a default implementation for non-iOS platforms
const AlarmSoundDefault: AlarmSoundInterface = {
  configureAudio: () => console.log('configureAudio: Not implemented on this platform'),
  playAlarmSound: () => Promise.resolve(false),
  stopAlarmSound: () => Promise.resolve(false),
  debugSoundFiles: () => Promise.resolve({ error: 'Not implemented on this platform' }),
};

// Export the native module on iOS, or the default implementation on other platforms
const AlarmSoundModule: AlarmSoundInterface = Platform.OS === 'ios' ? AlarmSound : AlarmSoundDefault;

export default AlarmSoundModule; 