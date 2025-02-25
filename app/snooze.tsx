import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

export default function SnoozeScreen() {
  const params = useLocalSearchParams();
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [maxSnoozes, setMaxSnoozes] = useState(3);
  const [snoozeInterval, setSnoozeInterval] = useState(5);
  const [isUnlimited, setIsUnlimited] = useState(false);
  
  // Bottom sheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('snoozeSettings');
        console.log('Loading snooze settings:', settings);
        if (settings) {
          const parsed = JSON.parse(settings);
          setSnoozeEnabled(parsed.enabled ?? true);
          setMaxSnoozes(parsed.max ?? 3);
          setSnoozeInterval(parsed.interval ?? 5);
          setIsUnlimited(parsed.unlimited ?? false);
          console.log('Parsed settings:', parsed);
        }
      } catch (error) {
        console.error('Error loading snooze settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Add this effect to reload settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          const settings = await AsyncStorage.getItem('snoozeSettings');
          if (settings) {
            const parsed = JSON.parse(settings);
            setSnoozeEnabled(parsed.enabled ?? true);
            setMaxSnoozes(parsed.max ?? 3);
            setSnoozeInterval(parsed.interval ?? 5);
            setIsUnlimited(parsed.unlimited ?? false);
            console.log('Reloaded settings:', parsed);
          }
        } catch (error) {
          console.error('Error reloading snooze settings:', error);
        }
      };
      loadSettings();
    }, [])
  );

  // Save settings function
  const saveSettings = async () => {
    try {
      const settings = {
        enabled: snoozeEnabled,
        max: maxSnoozes,
        interval: snoozeInterval,
        unlimited: isUnlimited
      };
      console.log('Saving snooze settings:', settings);
      await AsyncStorage.setItem('snoozeSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving snooze settings:', error);
    }
  };

  const handleMaxSnoozesSelect = async (count: number | 'unlimited') => {
    if (count === 'unlimited') {
      setIsUnlimited(true);
      setMaxSnoozes(999); // Use a large number for unlimited
    } else {
      setIsUnlimited(false);
      setMaxSnoozes(count as number);
    }
    
    // Make sure snooze stays enabled when changing max snoozes
    setSnoozeEnabled(true);
    
    // Save settings with snooze enabled
    await AsyncStorage.setItem('snoozeSettings', JSON.stringify({
      enabled: true, // Force enabled to true
      max: count === 'unlimited' ? 999 : count,
      interval: snoozeInterval,
      unlimited: count === 'unlimited'
    }));
    
    bottomSheetRef.current?.close();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Snooze</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Snooze</Text>
              <Switch
                value={snoozeEnabled}
                onValueChange={async (value) => {
                  setSnoozeEnabled(value);
                  await saveSettings();
                }}
                trackColor={{ false: '#767577', true: '#00BCD4' }}
                thumbColor={snoozeEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            {snoozeEnabled && (
              <>
                <Pressable 
                  style={styles.sectionButton}
                  onPress={() => router.push('/max-snoozes')}
                >
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionTitle}>Max snoozes</Text>
                    <Text style={styles.sectionValue}>
                      {isUnlimited ? 'Unlimited' : `${maxSnoozes} times`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </Pressable>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Interval</Text>
                <ScrollView style={styles.intervalList}>
                  {[1, 3, 5, 10, 15, 20, 25, 30, 45].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.intervalOption,
                        snoozeInterval === minutes && styles.selectedInterval
                      ]}
                      onPress={async () => {
                        setSnoozeInterval(minutes);
                        await saveSettings();
                      }}
                    >
                      <View style={styles.radioButton}>
                        {snoozeInterval === minutes && <View style={styles.radioSelected} />}
                      </View>
                      <Text style={styles.intervalText}>{minutes} min</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>

        {/* Bottom Sheet for Max Snoozes */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={{ backgroundColor: '#666' }}
        >
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Max Snoozes</Text>
            <ScrollView style={styles.maxSnoozesList}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.maxSnoozesOption,
                    maxSnoozes === count && !isUnlimited && styles.selectedOption
                  ]}
                  onPress={() => handleMaxSnoozesSelect(count)}
                >
                  <Text style={styles.optionText}>{count} times</Text>
                  {maxSnoozes === count && !isUnlimited && (
                    <Ionicons name="checkmark" size={24} color="#00BCD4" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.maxSnoozesOption,
                  isUnlimited && styles.selectedOption
                ]}
                onPress={() => handleMaxSnoozesSelect('unlimited')}
              >
                <Text style={styles.optionText}>Unlimited</Text>
                {isUnlimited && (
                  <Ionicons name="checkmark" size={24} color="#00BCD4" />
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </BottomSheet>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={async () => {
            await saveSettings();
            router.back();
          }}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
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
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionContent: {
    flex: 1,
  },
  sectionValue: {
    color: '#666',
    fontSize: 15,
  },
  intervalContainer: {
    marginTop: 20,
  },
  intervalList: {
    maxHeight: 200,
  },
  intervalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2C2C2E',
    marginVertical: 1,
    borderRadius: 8,
  },
  selectedInterval: {
    backgroundColor: '#3A3A3C',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00BCD4',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00BCD4',
  },
  intervalText: {
    color: '#fff',
    fontSize: 17,
  },
  saveButton: {
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#1C1C1E',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  maxSnoozesList: {
    flex: 1,
  },
  maxSnoozesOption: {
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
}); 