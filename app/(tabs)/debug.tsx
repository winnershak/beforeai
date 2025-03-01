import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DebugScreen() {
  const resetQuiz = async () => {
    await AsyncStorage.removeItem('quizCompleted');
    await AsyncStorage.removeItem('isPremium');
    Alert.alert('Quiz Reset', 'Quiz state has been reset.');
  };
  
  const showQuiz = () => {
    router.push('/quiz');
  };
  
  const checkStatus = async () => {
    const quizCompleted = await AsyncStorage.getItem('quizCompleted');
    const isPremium = await AsyncStorage.getItem('isPremium');
    
    Alert.alert(
      'App Status',
      `Quiz Completed: ${quizCompleted || 'false'}\nPremium: ${isPremium || 'false'}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Debug Tools</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={resetQuiz}>
          <Text style={styles.buttonText}>Reset Quiz State</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={showQuiz}>
          <Text style={styles.buttonText}>Show Quiz Flow</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={checkStatus}>
          <Text style={styles.buttonText}>Check App Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
}); 