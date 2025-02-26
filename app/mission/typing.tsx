import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Empty array for defaults - no default phrases
const DEFAULT_PHRASES: string[] = [];

export default function TypingMissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedTimes, setSelectedTimes] = useState(1);
  const [selectedPhrase, setSelectedPhrase] = useState<string>('');
  const [customPhrases, setCustomPhrases] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(60);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [phrase, setPhrase] = useState<string>('');
  const [newPhrase, setNewPhrase] = useState<string>('');

  // Load previously selected phrase when component mounts
  useEffect(() => {
    const loadSelectedPhrase = async () => {
      try {
        // First check if we're editing an existing alarm
        if (params.alarmId) {
          const alarmId = params.alarmId as string;
          console.log(`Loading typing settings for alarm: ${alarmId}`);
          
          // Try to load from the alarms array first
          const alarmsJson = await AsyncStorage.getItem('alarms');
          if (alarmsJson) {
            const alarms = JSON.parse(alarmsJson);
            if (alarms[alarmId] && 
                alarms[alarmId].mission && 
                alarms[alarmId].mission.settings && 
                alarms[alarmId].mission.settings.phrase) {
              
              const savedPhrase = alarms[alarmId].mission.settings.phrase;
              console.log(`Found saved phrase in alarms array: ${savedPhrase}`);
              setSelectedPhrase(savedPhrase);
              return; // Exit if we found the phrase
            }
          }
          
          // If not found in alarms array, try the dedicated key
          const alarmSpecificKey = `alarm_${alarmId}_typingSettings`;
          const savedTypingSettings = await AsyncStorage.getItem(alarmSpecificKey);
          if (savedTypingSettings) {
            const settings = JSON.parse(savedTypingSettings);
            if (settings.phrase) {
              console.log(`Found saved phrase in dedicated key: ${settings.phrase}`);
              setSelectedPhrase(settings.phrase);
              if (settings.times) setSelectedTimes(settings.times);
              return; // Exit if we found the phrase
            }
          }
        }
        
        // If no alarm-specific phrase found, try the global setting
        const savedPhrase = await AsyncStorage.getItem('selectedTypingPhrase');
        const savedTimes = await AsyncStorage.getItem('selectedTypingTimes');
        
        if (savedPhrase) {
          console.log(`Using globally saved phrase: ${savedPhrase}`);
          setSelectedPhrase(savedPhrase);
        }
        
        if (savedTimes) {
          const times = parseInt(savedTimes, 10);
          if (!isNaN(times)) {
            setSelectedTimes(times);
          }
        }
      } catch (error) {
        console.error('Error loading saved phrase:', error);
      }
    };
    
    loadSelectedPhrase();
  }, [params.alarmId]);

  // Existing useEffect for loading from URL params
  useEffect(() => {
    if (params.currentPhrase) {
      setSelectedPhrase(params.currentPhrase as string);
    }
  }, [params.currentPhrase]);

  // Existing useEffect for loading custom phrases
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Load custom phrases
        const savedPhrases = await AsyncStorage.getItem('customTypingPhrases');
        if (savedPhrases) {
          setCustomPhrases(JSON.parse(savedPhrases));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadSavedData();
  }, []);

  const handlePhraseSelect = (phrase: string) => {
    setSelectedPhrase(phrase);
  };

  const handlePreview = () => {
    router.push({
      pathname: '/mission/typing-alarm-preview',
      params: {
        ...params,
        missionId: 'typing',
        missionName: 'Typing',
        missionIcon: '⌨️',
        phrase: selectedPhrase,
        times: selectedTimes.toString(),
        previewMission: 'typing'
      }
    });
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) return;

    try {
      const updatedPhrases = [...customPhrases, newPhrase];
      await AsyncStorage.setItem('customTypingPhrases', JSON.stringify(updatedPhrases));
      setCustomPhrases(updatedPhrases);
      setNewPhrase('');
      setSelectedPhrase(newPhrase);
    } catch (error) {
      console.error('Error saving phrase:', error);
    }
  };

  const handleDone = async () => {
    if (!selectedPhrase) return;

    try {
      console.log('Typing mission - saving phrase:', selectedPhrase);
      console.log('Typing mission - saving times:', selectedTimes);
      
      // Create mission data
      const typingMission = {
        phrase: selectedPhrase,
        timeLimit: timeLimit,
        caseSensitive: caseSensitive,
        times: selectedTimes
      };

      // Save mission settings in multiple locations to ensure accessibility
      await AsyncStorage.setItem('selectedMissionType', 'Typing');
      await AsyncStorage.setItem('selectedMissionSettings', JSON.stringify(typingMission));
      
      // Also save the specific typing phrase for direct access
      await AsyncStorage.setItem('selectedTypingPhrase', selectedPhrase);
      await AsyncStorage.setItem('selectedTypingTimes', selectedTimes.toString());
      
      // If we're editing an existing alarm, save to that alarm's specific settings
      if (params.alarmId) {
        const alarmId = params.alarmId as string;
        console.log(`Saving typing settings to specific alarm: ${alarmId}`);
        
        // Load existing alarm data first
        const existingAlarmsJson = await AsyncStorage.getItem('alarms');
        if (existingAlarmsJson) {
          const alarms = JSON.parse(existingAlarmsJson);
          
          // Find and update the specific alarm
          if (alarms[alarmId]) {
            // Make sure we update the mission settings correctly
            if (!alarms[alarmId].mission) {
              alarms[alarmId].mission = {
                name: 'Typing',
                icon: 'keyboard',
                id: `mission_${Date.now()}`,
                settings: {}
              };
            }
            
            // Ensure mission is set correctly
            alarms[alarmId].mission.name = 'Typing';
            alarms[alarmId].mission.icon = 'keyboard';
            
            // Update settings
            alarms[alarmId].mission.settings = {
              type: 'Typing',
              phrase: selectedPhrase,
              times: selectedTimes,
              timeLimit: timeLimit,
              caseSensitive: caseSensitive
            };
            
            // Save the updated alarms object
            await AsyncStorage.setItem('alarms', JSON.stringify(alarms));
            console.log(`Updated alarm ${alarmId} with typing mission settings:`, alarms[alarmId].mission);
          } else {
            console.warn(`Alarm ${alarmId} not found in stored alarms`);
          }
        } else {
          console.warn('No alarms found in storage');
        }
        
        // Also save to a dedicated key for this specific alarm
        const alarmSpecificKey = `alarm_${alarmId}_typingSettings`;
        await AsyncStorage.setItem(alarmSpecificKey, JSON.stringify(typingMission));
        console.log(`Saved typing settings to dedicated key: ${alarmSpecificKey}`);
      }
      
      // Verify what was saved
      const savedType = await AsyncStorage.getItem('selectedMissionType');
      const savedSettings = await AsyncStorage.getItem('selectedMissionSettings');
      const savedPhrase = await AsyncStorage.getItem('selectedTypingPhrase');
      const savedTimes = await AsyncStorage.getItem('selectedTypingTimes');
      
      console.log('Typing mission verified saved data:', {
        missionType: savedType,
        missionSettings: savedSettings ? JSON.parse(savedSettings) : null,
        phrase: savedPhrase,
        times: savedTimes
      });

      // Navigate back with comprehensive params
      router.push({
        pathname: '/new-alarm',
        params: { 
          missionComplete: 'true',
          missionType: 'Typing',
          phrase: selectedPhrase,
          times: selectedTimes.toString(),
          alarmId: params.alarmId || '',
          editMode: params.editMode || 'false'
        }
      });
    } catch (error) {
      console.error('Error saving mission:', error);
      Alert.alert('Error', 'There was a problem saving your mission settings.');
    }
  };

  // Modified handleDeletePhrase to allow deletion of any phrase
  const handleDeletePhrase = async (phraseToDelete: string) => {
    Alert.alert(
      'Delete Phrase',
      'Are you sure you want to delete this phrase?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from custom phrases
              const updatedPhrases = customPhrases.filter(p => p !== phraseToDelete);
              await AsyncStorage.setItem('customTypingPhrases', JSON.stringify(updatedPhrases));
              setCustomPhrases(updatedPhrases);
              
              // If the deleted phrase was selected, clear the selection
              if (selectedPhrase === phraseToDelete) {
                setSelectedPhrase('');
              }
            } catch (error) {
              console.error('Error deleting phrase:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Select a Phrase</Text>
        
        <View style={styles.addPhraseContainer}>
          <TextInput
            style={styles.input}
            value={newPhrase}
            onChangeText={setNewPhrase}
            placeholder="Type a new phrase..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity 
            style={[styles.addButton, !newPhrase.trim() && styles.disabledButton]}
            onPress={handleAddPhrase}
            disabled={!newPhrase.trim()}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {selectedPhrase && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>Selected:</Text>
            <Text style={styles.selectedPhrase}>{selectedPhrase}</Text>
          </View>
        )}

        <View style={styles.phrasesContainer}>
          {customPhrases.length === 0 ? (
            <Text style={styles.emptyMessage}>No phrases yet. Add one above!</Text>
          ) : (
            customPhrases.map((phrase, index) => (
              <View key={index} style={styles.phraseRow}>
                <TouchableOpacity
                  style={[
                    styles.phraseButton,
                    selectedPhrase === phrase && styles.selectedPhraseButton
                  ]}
                  onPress={() => setSelectedPhrase(phrase)}
                >
                  <Text style={[
                    styles.phraseText,
                    selectedPhrase === phrase && styles.selectedPhraseText
                  ]}>
                    {phrase}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePhrase(phrase)}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF453A" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.doneButton,
            !selectedPhrase && styles.disabledButton
          ]} 
          onPress={handleDone}
          disabled={!selectedPhrase}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  selectedContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
  },
  selectedLabel: {
    color: '#666',
    marginBottom: 5,
  },
  selectedPhrase: {
    color: '#fff',
    fontSize: 16,
  },
  phrasesContainer: {
    gap: 10,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  phraseButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPhraseButton: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  phraseText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedPhraseText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 'auto',
    gap: 10,
  },
  previewButton: {
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  doneButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhraseContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 10,
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
}); 