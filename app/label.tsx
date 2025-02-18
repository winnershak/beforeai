import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LabelScreen() {
  const params = useLocalSearchParams();
  const [label, setLabel] = useState(params.currentLabel as string || '');

  const handleSubmit = async () => {
    try {
      // Get existing alarms
      const existingAlarms = await AsyncStorage.getItem('alarms');
      if (existingAlarms) {
        const alarms = JSON.parse(existingAlarms);
        
        // Update only the label for the current alarm
        const updatedAlarms = alarms.map((alarm: any) => 
          alarm.id === params.alarmId 
            ? { ...alarm, label: label }
            : alarm
        );
        
        // Save updated alarms when return is pressed
        await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
        
        // Return to previous screen with updated label
        router.back();
        router.setParams({ currentLabel: label });
      }
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Enter label"
        placeholderTextColor="#666"
        autoFocus
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 17,
  },
}); 