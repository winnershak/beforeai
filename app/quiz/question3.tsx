import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuizQuestion3() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    // Save answer and navigate immediately
    AsyncStorage.setItem('quiz_q3', option)
      .then(() => {
        router.push('/quiz/question4');
      })
      .catch(error => console.error('Error saving answer:', error));
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/1.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progress, { width: '37.5%' }]} />
              </View>
            </View>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.question}>What keeps you up at night?</Text>
            
            {[
              'Stress',
              'Social Media',
              'Work',
              'Noise',
              'Other',
              'Nothing'
            ].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  selectedOption === option && styles.selectedOption
                ]}
                onPress={() => handleOptionSelect(option)}
              >
                <Text style={[
                  styles.optionText,
                  selectedOption === option && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
                {selectedOption === option && (
                  <Ionicons name="checkmark-circle" size={24} color="#0A84FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => setShowSkipWarning(true)}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      <Modal
        transparent={true}
        visible={showSkipWarning}
        animationType="fade"
        onRequestClose={() => setShowSkipWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <Text style={styles.modalText}>
              Your answers help us to create you a better sleep experience.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.skipModalButton}
                onPress={() => {
                  setShowSkipWarning(false);
                  router.push('/quiz/question8');
                }}
              >
                <Text style={styles.skipModalButtonText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowSkipWarning(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay instead of gradient
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progress: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  question: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    lineHeight: isSmallDevice ? 32 : 36,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedOption: {
    backgroundColor: 'rgba(10,132,255,0.2)',
    borderColor: '#0A84FF',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedOptionText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    padding: 20,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',  // Subtle gray background
  },
  skipButtonText: {
    color: '#888',  // Lighter gray text
    fontSize: 14,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.3)',
    paddingTop: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '500',
  },
  skipModalButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  skipModalButtonText: {
    color: '#FF453A',
    fontSize: 17,
    fontWeight: '500',
  },
}); 