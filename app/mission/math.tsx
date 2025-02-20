import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

export default function MathConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [difficulty, setDifficulty] = useState<number>(1);
  const [times, setTimes] = useState<number>(3);
  const [showExample, setShowExample] = useState(false);

  const getDifficultyText = () => {
    if (difficulty === 1) return 'Easy';
    if (difficulty === 2) return 'Medium';
    return 'Hard';
  };

  const getExampleEquation = () => {
    switch(difficulty) {
      case 1: return '3 + 7 = ?';
      case 2: return '14 + 23 = ?';
      case 3: return '45 + 67 = ?';
      default: return '3 + 7 = ?';
    }
  };

  const handleSave = () => {
    router.push({
      pathname: '/new-alarm',
      params: {
        selectedMissionId: params.missionId as string,
        selectedMissionName: params.missionName as string,
        selectedMissionIcon: params.missionIcon as string,
        missionType: 'math',
        difficulty: difficulty.toString(),
        times: times.toString()
      }
    });
  };

  const handlePreview = () => {
    router.push({
      pathname: '/mission/alarm-preview',
      params: {
        difficulty: getDifficultyText().toLowerCase(),
        times: times.toString(),
        sound: 'Beacon',
        soundVolume: '1'
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.exampleButton}
        onPress={() => setShowExample(!showExample)}
      >
        <Text style={styles.exampleButtonText}>Example</Text>
      </TouchableOpacity>

      <View style={styles.equationContainer}>
        <Text style={styles.equation}>{getExampleEquation()}</Text>
      </View>

      <View style={styles.difficultyContainer}>
        <Text style={styles.difficultyTitle}>{getDifficultyText()}</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={3}
          step={1}
          value={difficulty}
          onValueChange={setDifficulty}
          minimumTrackTintColor="#0A84FF"
          maximumTrackTintColor="#333"
          thumbTintColor="#fff"
        />
        <View style={styles.difficultyLabels}>
          <Text style={styles.difficultyLabel}>Easy</Text>
          <Text style={styles.difficultyLabel}>Hard</Text>
        </View>
      </View>

      <View style={styles.timesContainer}>
        <ScrollView style={styles.timesScroll} showsVerticalScrollIndicator={false}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
            <TouchableOpacity
              key={num}
              style={[styles.timesButton, times === num && styles.selectedTimesButton]}
              onPress={() => setTimes(num)}
            >
              <Text style={[styles.timesButtonText, times === num && styles.selectedTimesButtonText]}>
                {num} <Text style={styles.timesLabel}>times</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    zIndex: 1,
  },
  equationContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  equation: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '500',
  },
  difficultyContainer: {
    margin: 15,
    backgroundColor: '#1c1c1e',
    padding: 15,
    borderRadius: 15,
  },
  difficultyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  slider: {
    height: 40,
  },
  difficultyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  difficultyLabel: {
    color: '#666',
    fontSize: 14,
  },
  timesContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 15,
    margin: 15,
    overflow: 'hidden',
    height: 150,
  },
  timesScroll: {
    flexGrow: 0,
  },
  timesButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedTimesButton: {
    backgroundColor: '#2c2c2e',
  },
  timesButtonText: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
  timesLabel: {
    fontSize: 16,
    color: '#666',
  },
  selectedTimesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 30,
  },
  previewButton: {
    backgroundColor: '#2c2c2e',
    padding: 15,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
  },
  previewButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#000',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exampleButton: {
    backgroundColor: '#0A84FF',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 10,
  },
  exampleButtonText: {
    color: '#fff',
    fontSize: 16,
  },
}); 