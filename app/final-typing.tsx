import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, TouchableOpacity, Animated, Dimensions, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function FinalTypingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [phrase, setPhrase] = useState('');
  const [input, setInput] = useState('');
  const [phrasesCompleted, setPhrasesCompleted] = useState(0);
  const [totalPhrases, setTotalPhrases] = useState(1);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeExpired, setTimeExpired] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const timerAnimation = useRef(new Animated.Value(100)).current;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const inputRef = useRef<TextInput>(null);
  const alarmId = params.alarmId as string;

  // Load alarm sound - modified to disable sound
  useEffect(() => {
    // No sound loading - sound has been disabled
    console.log('Sound disabled per request');
    
    return () => {
      // Cleanup function - nothing to clean up since we're not playing sound
    };
  }, []);

  // Load typing settings
  useEffect(() => {
    const loadTypingSettings = async () => {
      try {
        console.log('Loading typing settings...');
        
        // Try to get phrase from multiple sources
        let loadedPhrase = '';
        let loadedTimes = 1;
        let loadedCaseSensitive = true;
        let loadedTimeLimit = 60;
        
        // First check if we have an alarm ID - most specific source
        if (alarmId) {
          console.log(`Looking for typing settings for alarm: ${alarmId}`);
          
          // Try to load from the alarms array first (most reliable)
          const alarmsJson = await AsyncStorage.getItem('alarms');
          if (alarmsJson) {
            const alarms = JSON.parse(alarmsJson);
            if (alarms[alarmId] && 
                alarms[alarmId].mission &&
                alarms[alarmId].mission.settings) {
              
              const settings = alarms[alarmId].mission.settings;
              if (settings.phrase) {
                loadedPhrase = settings.phrase;
                if (settings.times) loadedTimes = settings.times;
                if (settings.caseSensitive !== undefined) loadedCaseSensitive = settings.caseSensitive;
                if (settings.timeLimit) loadedTimeLimit = settings.timeLimit;
                console.log(`Found phrase in alarms array: "${loadedPhrase}"`);
              }
            }
          }
          
          // If not found in alarms array, check alarm-specific key
          if (!loadedPhrase) {
            const alarmSpecificKey = `alarm_${alarmId}_typingSettings`;
            const savedTypingSettings = await AsyncStorage.getItem(alarmSpecificKey);
            
            if (savedTypingSettings) {
              const settings = JSON.parse(savedTypingSettings);
              if (settings.phrase) {
                loadedPhrase = settings.phrase;
                if (settings.times) loadedTimes = settings.times;
                if (settings.caseSensitive !== undefined) loadedCaseSensitive = settings.caseSensitive;
                if (settings.timeLimit) loadedTimeLimit = settings.timeLimit;
                console.log(`Found phrase in alarm-specific key: "${loadedPhrase}"`);
              }
            }
          }
        }
        
        // If still no phrase, try URL params
        if (!loadedPhrase && params.phrase) {
          loadedPhrase = params.phrase as string;
          console.log(`Using phrase from URL params: "${loadedPhrase}"`);
        }
        
        // If still no phrase, try global settings
        if (!loadedPhrase) {
          const savedPhrase = await AsyncStorage.getItem('selectedTypingPhrase');
          if (savedPhrase) {
            loadedPhrase = savedPhrase;
            console.log(`Using globally saved phrase: "${loadedPhrase}"`);
          }
        }
        
        // Check for times in params or storage
        if (params.times) {
          const paramTimes = parseInt(params.times as string, 10);
          if (!isNaN(paramTimes)) loadedTimes = paramTimes;
        } else {
          const savedTimes = await AsyncStorage.getItem('selectedTypingTimes');
          if (savedTimes) {
            const parsedTimes = parseInt(savedTimes, 10);
            if (!isNaN(parsedTimes)) loadedTimes = parsedTimes;
          }
        }
        
        // If we still don't have a phrase, set a default
        if (!loadedPhrase) {
          loadedPhrase = 'Please complete the typing mission';
          console.log('No phrase found, using default');
        }
        
        // Load mission settings
        const missionSettingsJson = await AsyncStorage.getItem('selectedMissionSettings');
        if (missionSettingsJson) {
          const missionSettings = JSON.parse(missionSettingsJson);
          if (missionSettings.timeLimit) loadedTimeLimit = missionSettings.timeLimit;
          if (missionSettings.caseSensitive !== undefined) loadedCaseSensitive = missionSettings.caseSensitive;
        }
        
        // Set all the loaded values to state
        console.log('Final typing settings:', {
          phrase: loadedPhrase,
          times: loadedTimes,
          caseSensitive: loadedCaseSensitive,
          timeLimit: loadedTimeLimit
        });
        
        setPhrase(loadedPhrase);
        setTotalPhrases(loadedTimes);
        setCaseSensitive(loadedCaseSensitive);
        setTimeLimit(loadedTimeLimit);
        
        // Start the timer animation
        startTimerAnimation(loadedTimeLimit);
        
      } catch (error) {
        console.error('Error loading typing settings:', error);
        // Fallback to default values
        setPhrase('Please type this phrase');
        setTotalPhrases(1);
        startTimerAnimation(60);
      }
    };
    
    loadTypingSettings();
  }, [params]);

  // Timer animation function
  const startTimerAnimation = (seconds: number) => {
    console.log(`Starting timer animation for ${seconds} seconds`);
    timerAnimation.setValue(100); // Reset to full width
    
    Animated.timing(timerAnimation, {
      toValue: 0,
      duration: seconds * 1000,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished && !missionCompleted) {
        console.log('Timer finished, mission failed');
        setTimeExpired(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    });
  };

  // Handle input change
  const handleInputChange = (text: string) => {
    setInput(text);
    
    const isMatch = caseSensitive 
      ? text === phrase
      : text.toLowerCase() === phrase.toLowerCase();
    
    if (isMatch) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (phrasesCompleted + 1 < totalPhrases) {
        // More phrases to complete
        setPhrasesCompleted(prev => prev + 1);
        setInput('');
        
        // Restart timer for next phrase
        startTimerAnimation(timeLimit);
      } else {
        // All phrases completed
        handleMissionComplete();
      }
    }
  };

  // Render text with color coding for letter comparison
  const renderText = () => {
    const maxLength = Math.max(input.length, phrase.length);
    
    return Array.from({ length: maxLength }).map((_, index) => {
      let color = '#666'; // Default color for not-yet-typed characters
      let letterToShow = phrase[index] || ' ';
      
      if (index < input.length) {
        letterToShow = input[index];
        if (index < phrase.length) {
          const isLetterMatch = caseSensitive 
            ? input[index] === phrase[index]
            : input[index].toLowerCase() === phrase[index].toLowerCase();
            
          color = isLetterMatch ? '#4CAF50' : '#FF5252'; // Green for correct, red for incorrect
        } else {
          color = '#FF5252'; // Red for extra characters
        }
      }
      
      return (
        <Text key={index} style={[styles.letter, { color }]}>
          {letterToShow}
        </Text>
      );
    });
  };

  const handleMissionComplete = async () => {
    console.log('Mission completed!');
    setMissionCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Stop the animation
      timerAnimation.stopAnimation();
    } catch (error) {
      console.error('Error in mission complete handling:', error);
    }
    
    // Skip the built-in success screen and go directly to Instagram success
    router.replace('/alarm-success');

    // Keep the stats update code (lines 246-291) but remove the navigation delay
    if (phrasesCompleted >= totalPhrases) {
      try {
        // Update mission-specific count
        const missionName = 'Typing';
        const missionCountKey = `${missionName.toLowerCase()}Count`;
        const missionCount = await AsyncStorage.getItem(missionCountKey);
        const newMissionCount = missionCount ? parseInt(missionCount) + 1 : 1;
        await AsyncStorage.setItem(missionCountKey, newMissionCount.toString());
        
        // Update mission breakdown
        const breakdownJson = await AsyncStorage.getItem('missionBreakdown');
        let breakdown = breakdownJson ? JSON.parse(breakdownJson) : {};
        breakdown[missionName] = newMissionCount;
        await AsyncStorage.setItem('missionBreakdown', JSON.stringify(breakdown));
        
        // Add XP (50 XP for completing mission)
        const currentXP = await AsyncStorage.getItem('userXP');
        const newXP = currentXP ? parseInt(currentXP) + 50 : 50;
        await AsyncStorage.setItem('userXP', newXP.toString());
        
        // Update streak
        const currentDate = new Date().toISOString().split('T')[0];
        const lastCompletionDate = await AsyncStorage.getItem('lastCompletionDate');
        const currentStreak = await AsyncStorage.getItem('currentStreak');
        let newStreak = 1;
        
        if (currentStreak) {
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toISOString().split('T')[0];
          
          if (lastCompletionDate === yesterday) {
            newStreak = parseInt(currentStreak) + 1;
          } else if (lastCompletionDate === currentDate) {
            newStreak = parseInt(currentStreak);
          }
        }
        
        await AsyncStorage.setItem('currentStreak', newStreak.toString());
        await AsyncStorage.setItem('lastCompletionDate', currentDate);
        
        console.log(`Updated stats for ${missionName}: count=${newMissionCount}, streak=${newStreak}`);
      } catch (error) {
        console.error('Error updating stats:', error);
      }
    }
  };

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
    
    // Handle keyboard appearance
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  return (
    <>
      {/* This hides the header and disables gestures */}
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade'
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        {/* Timer bar */}
        <View style={styles.timerContainer}>
          <Animated.View 
            style={[
              styles.timerBar,
              {
                width: timerAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
        
        {timeExpired ? (
          <View style={styles.completionContainer}>
            <Text style={styles.failedText}>Time Expired!</Text>
            <Text style={styles.completionSubtext}>Alarm will continue...</Text>
          </View>
        ) : (
          <View style={styles.missionContainer}>
            <View style={styles.progressContainer}>
              <View style={styles.counterContainer}>
                <Text style={styles.counter}>
                  {input.length} / {phrase.length}
                </Text>
              </View>
            </View>
            
            <View style={styles.phraseContainer}>
              <View style={styles.letterContainer}>
                {renderText()}
              </View>
            </View>
            
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={input}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              autoFocus
            />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  timerContainer: {
    height: 3,
    backgroundColor: '#333',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  timerBar: {
    height: '100%',
    backgroundColor: '#ff3b30',
  },
  missionContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  progressContainer: {
    marginBottom: 20,
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  counter: {
    color: '#666',
    fontSize: 18,
  },
  phraseContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  letterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  letter: {
    fontSize: 24,
    fontWeight: '500',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completionText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  failedText: {
    color: '#ff3b30',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  completionSubtext: {
    color: '#666',
    fontSize: 18,
    textAlign: 'center',
  }
});