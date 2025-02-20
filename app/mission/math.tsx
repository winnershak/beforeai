import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

export default function MathMission() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState(0);
  const [times, setTimes] = useState(3);
  const [showExample, setShowExample] = useState(false);

  const getDifficultyText = () => {
    if (difficulty <= 1) return 'Very easy';
    if (difficulty <= 2) return 'Easy';
    if (difficulty <= 3) return 'Medium';
    if (difficulty <= 4) return 'Hard';
    return 'Hell mode';
  };

  const handleDone = () => {
    router.push({
      pathname: '/new-alarm',
      params: {
        mission: 'Math',
        difficulty: getDifficultyText().toLowerCase()
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Math</Text>

      <TouchableOpacity
        style={styles.exampleButton}
        onPress={() => setShowExample(!showExample)}
      >
        <Text style={styles.exampleButtonText}>Example</Text>
      </TouchableOpacity>

      {showExample && (
        <View style={styles.exampleContainer}>
          <Text style={styles.equation}>3+4 = ?</Text>
        </View>
      )}

      <View style={styles.difficultyContainer}>
        <Text style={styles.difficultyTitle}>{getDifficultyText()}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={5}
          step={1}
          value={difficulty}
          onValueChange={setDifficulty}
          minimumTrackTintColor="#0A84FF"
          maximumTrackTintColor="#333"
          thumbTintColor="#fff"
        />
        <View style={styles.difficultyLabels}>
          <Text style={styles.difficultyLabel}>Very easy</Text>
          <Text style={styles.difficultyLabel}>Hell mode</Text>
        </View>
      </View>

      <View style={styles.timesContainer}>
        <Text style={styles.timesTitle}>Times</Text>
        {[2, 3, 4].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.timesButton, times === num && styles.selectedTimesButton]}
            onPress={() => setTimes(num)}
          >
            <Text style={[styles.timesButtonText, times === num && styles.selectedTimesButtonText]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.previewButton}>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  exampleButton: {
    backgroundColor: '#0A84FF',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  exampleButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  exampleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  equation: {
    color: '#fff',
    fontSize: 40,
  },
  difficultyContainer: {
    marginBottom: 40,
    backgroundColor: '#1c1c1e',
    padding: 20,
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
    overflow: 'hidden',
  },
  timesTitle: {
    color: '#666',
    fontSize: 16,
    padding: 10,
    textAlign: 'center',
  },
  timesButton: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  selectedTimesButton: {
    backgroundColor: '#2c2c2e',
  },
  timesButtonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  selectedTimesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
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
  doneButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
  },
  doneButtonText: {
    color: '#000',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 