import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const phrases = [
  "JUST DO IT", // Add more phrases...
];

export default function TypingPhrasesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [customPhrase, setCustomPhrase] = useState('');
  const [selectedPhrase, setSelectedPhrase] = useState(params.currentPhrase as string);

  const handleSelect = (phrase: string) => {
    router.push({
      pathname: '/mission/typing',
      params: {
        ...params,
        currentPhrase: phrase
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Phrase</Text>

      <View style={styles.customPhraseContainer}>
        <TextInput
          style={styles.customPhraseInput}
          placeholder="Type your own phrase..."
          placeholderTextColor="#666"
          value={customPhrase}
          onChangeText={setCustomPhrase}
          multiline
        />
        <TouchableOpacity 
          style={styles.useCustomButton}
          onPress={() => handleSelect(customPhrase)}
        >
          <Text style={styles.useCustomButtonText}>Use Custom Phrase</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>or choose from library</Text>

      <ScrollView style={styles.phraseList}>
        {phrases.map((phrase, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.phraseButton,
              selectedPhrase === phrase && styles.selectedPhraseButton
            ]}
            onPress={() => handleSelect(phrase)}
          >
            <Text style={styles.phraseButtonText}>{phrase}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    marginTop: 40,
    marginBottom: 20,
  },
  customPhraseContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  customPhraseInput: {
    color: '#fff',
    fontSize: 16,
    minHeight: 60,
  },
  useCustomButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  useCustomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 20,
  },
  phraseList: {
    flex: 1,
  },
  phraseButton: {
    padding: 15,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedPhraseButton: {
    backgroundColor: '#007AFF',
  },
  phraseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
}); 