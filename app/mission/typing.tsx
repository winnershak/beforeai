import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const phrases = [
  "JUST DO IT",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Success is not final, failure is not fatal.",
  "Life is what happens while you're busy making other plans.",
  "Every moment is a fresh beginning.",
  // Add more phrases...
];

export default function TypingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedTimes, setSelectedTimes] = useState(1);
  const [selectedPhrase, setSelectedPhrase] = useState(params.currentPhrase as string || phrases[0]);

  useEffect(() => {
    if (params.currentPhrase) {
      setSelectedPhrase(params.currentPhrase as string);
    }
  }, [params.currentPhrase]);

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

  const handleDone = () => {
    router.push({
      pathname: '/new-alarm',
      params: {
        ...params,
        selectedMissionId: 'typing',
        selectedMissionName: 'Typing',
        selectedMissionIcon: '⌨️',
        phrase: selectedPhrase,
        times: selectedTimes.toString()
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Typing</Text>
      
      <Text style={styles.sectionTitle}>Selected Phrase</Text>
      <Text style={styles.phrase}>{selectedPhrase}</Text>
      
      <TouchableOpacity 
        style={styles.selectPhraseButton}
        onPress={() => router.push({
          pathname: '/mission/typingphrases',
          params: {
            ...params,
            currentPhrase: selectedPhrase,
            times: selectedTimes.toString()
          }
        })}
      >
        <Text style={styles.selectPhraseText}>Select Phrase</Text>
        <Text style={styles.phraseCount}>{phrases.length} phrases</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#007AFF',
    fontSize: 18,
    marginBottom: 10,
  },
  phrase: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 30,
  },
  selectPhraseButton: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  selectPhraseText: {
    color: '#fff',
    fontSize: 18,
  },
  phraseCount: {
    color: '#007AFF',
    fontSize: 18,
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 