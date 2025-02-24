import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const activeAlarms = new Set<string>();
let activeSound: Audio.Sound | null = null;

const alarmSounds = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

export default function AlarmRingScreen() {
  const params = useLocalSearchParams();
  const alarmId = params.alarmId as string;
  const [showSnooze, setShowSnooze] = React.useState(false);
  
  useEffect(() => {
    console.log('AlarmRingScreen mounted with ID:', alarmId);
    
    const setupAlarmAndSettings = async () => {
      try {
        // Check alarm settings
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (!alarmsJson) {
          console.log('No alarms found in storage');
          return;
        }
        
        const alarms = JSON.parse(alarmsJson);
        const currentAlarm = alarms.find((a: any) => a.id === alarmId);
        
        if (currentAlarm) {
          // Fix: properly read snooze settings from alarm
          const snoozeEnabled = currentAlarm.snooze?.enabled;
          console.log('Found alarm settings:', {
            snoozeEnabled,
            hasMission: params.hasMission
          });
          setShowSnooze(Boolean(snoozeEnabled));
        }

        // Then setup audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          alarmSounds[params.sound as keyof typeof alarmSounds],
          {
            shouldPlay: true,
            isLooping: true,
            volume: Number(params.soundVolume) || 1,
          }
        );
        
        activeSound = sound;
        await sound.playAsync();
        console.log('Alarm sound playing successfully');
      } catch (error) {
        console.error('Error in setup:', error);
      }
    };

    setupAlarmAndSettings();

    return () => {
      console.log('Cleaning up alarm screen');
      if (activeSound) {
        activeSound.stopAsync().then(() => {
          activeSound?.unloadAsync();
          activeSound = null;
        });
      }
    };
  }, [alarmId]);

  const handleStopAlarm = async () => {
    if (activeSound) {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
      activeSound = null;
    }
    router.push('/');
  };

  const handleSnooze = async () => {
    try {
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (!alarmsJson) return;
      
      const alarms = JSON.parse(alarmsJson);
      const currentAlarm = alarms.find((a: any) => a.id === alarmId);
      
      if (!currentAlarm || !currentAlarm.snoozeEnabled) {
        console.log('Snooze not enabled for this alarm');
        return;
      }

      console.log(`Snoozing alarm for ${currentAlarm.snoozeTime} minutes`);
      
      if (activeSound) {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
        activeSound = null;
      }

      const snoozeSeconds = currentAlarm.snoozeTime * 60;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Alarm",
          sound: true,
          data: {
            alarmId: params.alarmId,
            sound: params.sound,
            soundVolume: params.soundVolume,
            hasMission: params.hasMission,
            snoozeCount: (currentAlarm.snoozeCount || 0) + 1,
            maxSnoozes: currentAlarm.maxSnoozes
          }
        },
        trigger: {
          type: 'timeInterval',
          seconds: snoozeSeconds,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput
      });

      router.push('/');
    } catch (error) {
      console.error('Error handling snooze:', error);
    }
  };

  const handleStartMission = () => {
    router.push({
      pathname: '/final-math',
      params: {
        alarmId: params.alarmId,
        sound: params.sound,
        soundVolume: params.soundVolume,
        hasMission: params.hasMission
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {new Date().toLocaleTimeString()}
      </Text>

      <TouchableOpacity 
        style={[styles.button, styles.stopButton]}
        onPress={handleStopAlarm}
      >
        <Text style={styles.buttonText}>Stop Alarm</Text>
      </TouchableOpacity>

      {showSnooze && (
        <TouchableOpacity 
          style={[styles.button, styles.snoozeButton]}
          onPress={handleSnooze}
        >
          <Text style={styles.buttonText}>Snooze</Text>
        </TouchableOpacity>
      )}

      {params.hasMission === 'true' && (
        <TouchableOpacity 
          style={[styles.button, styles.missionButton]}
          onPress={handleStartMission}
        >
          <Text style={styles.buttonText}>Start Mission</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  time: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  snoozeButton: {
    backgroundColor: '#007AFF',
  },
  missionButton: {
    backgroundColor: '#00BCD4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 