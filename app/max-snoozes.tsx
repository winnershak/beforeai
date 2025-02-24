import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MaxSnoozesScreen() {
  const [maxSnoozes, setMaxSnoozes] = useState(3);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('snoozeSettings');
        if (settings) {
          const { max, unlimited } = JSON.parse(settings);
          setMaxSnoozes(max);
          setIsUnlimited(unlimited || false);
        }
      } catch (error) {
        console.error('Error loading snooze settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSelect = async (count: number | 'unlimited') => {
    try {
      const settings = await AsyncStorage.getItem('snoozeSettings');
      const currentSettings = settings ? JSON.parse(settings) : {};
      
      if (count === 'unlimited') {
        setIsUnlimited(true);
        setMaxSnoozes(999);
        await AsyncStorage.setItem('snoozeSettings', JSON.stringify({
          ...currentSettings,
          max: 999,
          unlimited: true,
        }));
      } else {
        setIsUnlimited(false);
        setMaxSnoozes(count as number);
        await AsyncStorage.setItem('snoozeSettings', JSON.stringify({
          ...currentSettings,
          max: count,
          unlimited: false,
        }));
      }
      
      console.log('Saved with preserved settings:', await AsyncStorage.getItem('snoozeSettings'));
      router.back();
    } catch (error) {
      console.error('Error saving max snoozes:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Max Snoozes</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[
            styles.option,
            isUnlimited && styles.selectedOption
          ]}
          onPress={() => handleSelect('unlimited')}
        >
          <Text style={styles.optionText}>Unlimited</Text>
          {isUnlimited && (
            <Ionicons name="checkmark" size={24} color="#00BCD4" />
          )}
        </TouchableOpacity>

        <View style={styles.separator} />

        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
          <TouchableOpacity
            key={count}
            style={[
              styles.option,
              maxSnoozes === count && !isUnlimited && styles.selectedOption
            ]}
            onPress={() => handleSelect(count)}
          >
            <Text style={styles.optionText}>{count} times</Text>
            {maxSnoozes === count && !isUnlimited && (
              <Ionicons name="checkmark" size={24} color="#00BCD4" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2C2E',
    marginVertical: 1,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: '#3A3A3C',
  },
  optionText: {
    color: '#fff',
    fontSize: 17,
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 10,
  },
}); 