import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_PHRASES = [
  "Just do it"
];

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

  useEffect(() => {
    if (params.currentPhrase) {
      setSelectedPhrase(params.currentPhrase as string);
    }
  }, [params.currentPhrase]);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Load saved mission data
        const missionData = await AsyncStorage.getItem('missionData');
        if (missionData) {
          const data = JSON.parse(missionData);
          if (data.type === 'Typing' && data.phrase) {
            setPhrase(data.phrase);
          }
        }

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
      setSelectedPhrase(newPhrase); // Select the newly added phrase
    } catch (error) {
      console.error('Error saving phrase:', error);
    }
  };

  const handleDone = async () => {
    if (!selectedPhrase) return;

    try {
      // Create mission data
      const typingMission = {
        phrase: selectedPhrase,
        timeLimit: 30,
        caseSensitive: false
      };

      // Save directly to new-alarm's expected format
      await AsyncStorage.setItem('selectedMissionType', 'Typing');
      await AsyncStorage.setItem('selectedMissionSettings', JSON.stringify(typingMission));
      
      console.log('DEBUG - Saved mission type:', 'Typing');
      console.log('DEBUG - Saved mission settings:', typingMission);

      // Navigate back with simple params
      router.push({
        pathname: '/new-alarm',
        params: { 
          missionComplete: 'true',
          missionType: 'Typing'
        }
      });
    } catch (error) {
      console.error('Error saving mission:', error);
    }
  };

  const handleSaveMission = async () => {
    try {
      const missionData = {
        type: 'Typing',
        phrase: selectedPhrase,
        timeLimit: timeLimit,
        caseSensitive: caseSensitive,
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem('missionData', JSON.stringify(missionData));
      console.log('Typing mission saved:', missionData);

      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error saving typing mission:', error);
    }
  };

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
              const updatedPhrases = customPhrases.filter(p => p !== phraseToDelete);
              await AsyncStorage.setItem('customTypingPhrases', JSON.stringify(updatedPhrases));
              setCustomPhrases(updatedPhrases);
              
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
          {[...DEFAULT_PHRASES, ...customPhrases].map((phrase, index) => (
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
          ))}
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
}); 