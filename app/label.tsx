import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LabelScreen() {
  const params = useLocalSearchParams();
  const [label, setLabel] = useState(params.currentLabel as string || '');
  
  // Log all params for debugging
  useEffect(() => {
    console.log('Label screen params:', JSON.stringify(params));
  }, [params]);

  const handleSubmit = async () => {
    try {
      console.log(`Saving label: "${label}"`);
      
      // For first-time alarms, we just need to save the label globally
      // The new-alarm screen will pick it up when creating the alarm
      await AsyncStorage.setItem('pendingLabel', label);
      
      // Also save as currentLabel for backward compatibility
      await AsyncStorage.setItem('currentLabel', label);
      
      console.log('Label saved to pendingLabel and currentLabel');
      
      // Navigate back to new-alarm
      router.back();
      
    } catch (error) {
      console.error('Error saving label:', error);
      router.back();
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