import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
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
          const parsed = JSON.parse(settings);
          setMaxSnoozes(parsed.max ?? 3);
          setIsUnlimited(parsed.unlimited ?? false);
          console.log('Loaded max snooze settings:', parsed);
        }
      } catch (error) {
        console.error('Error loading snooze settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSelect = async (count: number | 'unlimited') => {
    try {
      // First get the current settings to preserve other values
      const currentSettingsJson = await AsyncStorage.getItem('snoozeSettings');
      let currentSettings = currentSettingsJson 
        ? JSON.parse(currentSettingsJson) 
        : { enabled: true, max: 3, interval: 5, unlimited: false };
      
      // Update with new values
      const newSettings = {
        ...currentSettings,
        enabled: true, // ALWAYS keep enabled true when changing max snoozes
        max: count === 'unlimited' ? 999 : count,
        unlimited: count === 'unlimited'
      };
      
      console.log('Saving max snooze settings with enabled=true:', newSettings);
      await AsyncStorage.setItem('snoozeSettings', JSON.stringify(newSettings));
      
      // Log to verify
      console.log('Saved with preserved settings:', newSettings);
      
      router.back();
    } catch (error) {
      console.error('Error saving max snooze settings:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Max Snoozes</Text>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
        </ScrollView>
      </View>
    </SafeAreaView>
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
    paddingTop: 20, // Reduced from 60 to keep content higher
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 10, // Start content closer to the top
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2C2E',
    marginVertical: 4,
    borderRadius: 12,
  },
  selectedOption: {
    backgroundColor: '#3A3A3C',
  },
  optionText: {
    color: '#fff',
    fontSize: 17,
  },
}); 