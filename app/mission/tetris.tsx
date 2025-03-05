import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TetrisMissionSelector() {
  const params = useLocalSearchParams();
  const [difficulty, setDifficulty] = useState('easy');
  
  const handleSave = () => {
    // Set very low target scores for all difficulty levels
    let targetScore = 50; // Super easy for easy difficulty
    
    if (difficulty === 'medium') {
      targetScore = 100;
    } else if (difficulty === 'hard') {
      targetScore = 150;
    }
    
    // Return to new alarm with selected settings
    router.navigate({
      pathname: params.returnTo as string || '/new-alarm',
      params: {
        selectedMissionType: 'Tetris',
        selectedMissionName: 'Tetris',
        selectedMissionIcon: '🧩',
        missionSettings: JSON.stringify({
          type: 'Tetris',
          difficulty,
          targetScore
        }),
        mission: JSON.stringify({
          name: 'Tetris',
          icon: '🧩',
          settings: {
            type: 'Tetris',
            difficulty,
            targetScore
          }
        })
      }
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tetris Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={[styles.option, difficulty === 'easy' && styles.selectedOption]}
            onPress={() => setDifficulty('easy')}
          >
            <Text style={styles.optionText}>Easy</Text>
            <Text style={styles.optionDescription}>Target: 50 points</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.option, difficulty === 'medium' && styles.selectedOption]}
            onPress={() => setDifficulty('medium')}
          >
            <Text style={styles.optionText}>Medium</Text>
            <Text style={styles.optionDescription}>Target: 100 points</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.option, difficulty === 'hard' && styles.selectedOption]}
            onPress={() => setDifficulty('hard')}
          >
            <Text style={styles.optionText}>Hard</Text>
            <Text style={styles.optionDescription}>Target: 150 points</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#2C2C2E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#3A3A3C',
    borderColor: '#0A84FF',
    borderWidth: 2,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#0A84FF',
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