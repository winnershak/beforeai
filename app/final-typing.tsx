import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FinalTypingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [completed, setCompleted] = useState(false);
  
  // Get phrase safely from params or settings
  const getPhrase = () => {
    console.log('DEBUG - Params:', params);
    
    // Try to get phrase from different possible locations
    if (params.phrase) {
      return params.phrase as string;
    }
    
    if (params.settings && typeof params.settings === 'object') {
      const settings = params.settings as any;
      return settings.phrase || '';
    }
    
    if (typeof params.settings === 'string') {
      try {
        const settings = JSON.parse(params.settings as string);
        return settings.phrase || '';
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
    
    return 'Just do it'; // Default fallback phrase
  };
  
  const phrase = getPhrase();
  
  // Format phrase for display (replace smart quotes)
  const formattedPhrase = phrase ? phrase.replace(/'/g, "'") : 'Just do it';
  
  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0 && !completed) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !completed) {
      // Time's up, mission failed
      handleFail();
    }
  }, [timeLeft, completed]);

  useEffect(() => {
    // Check if input matches phrase
    const isCaseSensitive = params.caseSensitive === 'true';
    
    if (userInput && phrase) {
      const inputToCheck = isCaseSensitive ? userInput : userInput.toLowerCase();
      const phraseToCheck = isCaseSensitive ? phrase : phrase.toLowerCase();
      
      if (inputToCheck === phraseToCheck) {
        setCompleted(true);
        handleSuccess();
      }
    }
  }, [userInput]);

  const handleSuccess = async () => {
    try {
      // Save completion status
      await AsyncStorage.setItem('missionCompleted', 'true');
      
      // Navigate back to home
      router.push('/');
    } catch (error) {
      console.error('Error handling success:', error);
    }
  };

  const handleFail = async () => {
    try {
      // Save failure status
      await AsyncStorage.setItem('missionCompleted', 'false');
      
      // Restart the alarm
      router.push({
        pathname: '/alarm-ring',
        params: {
          alarmId: params.alarmId,
          hasMission: 'true'
        }
      });
    } catch (error) {
      console.error('Error handling failure:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Type the phrase:</Text>
        
        <View style={styles.phraseContainer}>
          <Text style={styles.phrase}>{formattedPhrase}</Text>
        </View>
        
        <TextInput
          style={styles.input}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type here..."
          placeholderTextColor="#666"
          autoFocus
          multiline
        />
        
        <Text style={styles.timer}>
          Time left: {timeLeft} seconds
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.failButton]}
          onPress={handleFail}
        >
          <Text style={styles.buttonText}>Give Up</Text>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  phraseContainer: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  phrase: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
  },
  timer: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  failButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});