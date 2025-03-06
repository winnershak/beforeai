import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TetrisMissionScreen() {
  const params = useLocalSearchParams();
  
  // Save mission settings and navigate back to new-alarm
  const saveMission = async () => {
    try {
      // Create mission settings object
      const missionSettings = {
        type: 'Tetris'
      };
      
      // Convert settings to JSON string
      const settingsString = JSON.stringify(missionSettings);
      
      // Save mission data to AsyncStorage before navigation
      if (params.alarmId) {
        // For editing existing alarm
        const alarmKey = `alarm_${params.alarmId}`;
        const alarmData = await AsyncStorage.getItem(alarmKey);
        
        if (alarmData) {
          const alarm = JSON.parse(alarmData);
          
          // Create a proper mission object
          const missionObj = {
            id: 'tetris',
            name: 'Tetris',
            emoji: '🎮',
            type: 'Tetris',
            settings: missionSettings
          };
          
          // Store the mission object directly
          alarm.mission = missionObj;
          
          await AsyncStorage.setItem(alarmKey, JSON.stringify(alarm));
          console.log('Saved Tetris mission to alarm:', missionObj);
        }
      }
      
      // Create a serialized mission object for router params
      const missionObj = {
        id: 'tetris',
        name: 'Tetris',
        emoji: '🎮',
        type: 'Tetris',
        settings: missionSettings
      };
      
      // Stringify the entire mission object
      const missionString = JSON.stringify(missionObj);
      console.log('Sending Tetris mission to new-alarm:', missionString);
      
      // Also save to AsyncStorage for backup
      await AsyncStorage.setItem('selectedMissionType', 'Tetris');
      await AsyncStorage.setItem('selectedMissionSettings', settingsString);
      
      // Navigate back to new-alarm with the mission data
      router.push({
        pathname: '/new-alarm',
        params: { 
          ...params,
          selectedMissionId: 'tetris',
          selectedMissionName: 'Tetris',
          selectedMissionEmoji: '🎮',
          selectedMissionType: 'Tetris',
          missionSettings: settingsString,
          mission: missionString
        }
      });
    } catch (error) {
      console.error('Error saving Tetris mission:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Tetris Mission' }} />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>🎮</Text>
          <Text style={styles.title}>Tetris Mission</Text>
          <Text style={styles.description}>
            Play Tetris to turn off the alarm
          </Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            You'll need to clear 3 lines in Tetris to turn off the alarm.
          </Text>
        </View>
        
        <TouchableOpacity style={styles.saveButton} onPress={saveMission}>
          <Text style={styles.saveButtonText}>Save Mission</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  saveButton: {
    backgroundColor: '#4169E1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 