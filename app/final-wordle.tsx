import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Vibration, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';

// Word list - common 5-letter words
const WORDS = [
  'APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EARTH', 'FLAME', 'GHOST', 'HEART', 
  'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PIANO', 
  'QUEEN', 'RIVER', 'SNAKE', 'TIGER', 'UNCLE', 'VOICE', 'WATER', 'YOUTH', 
  'ZEBRA', 'BRAVE', 'CLOUD', 'DREAM', 'EAGLE', 'FOCUS', 'GRAPE', 'HOUSE',
  'LIGHT', 'MONEY', 'NORTH', 'PAINT', 'QUICK', 'RADIO', 'SMILE', 'TRAIN',
  'URBAN', 'VALUE', 'WORLD', 'XYLOPHONE', 'YOUNG', 'BREAD', 'CLOCK', 'DRINK'
];

// Get a random word from the list
const getRandomWord = () => {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
};

// Update the getRandomWord function to return the same word for all users on a given day
const getWordOfTheDay = () => {
  // Get current date in format YYYY-MM-DD
  const today = new Date();
  const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  
  // Use the date string to seed the random number generator
  // This ensures all users get the same word on the same day
  const dateCode = dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const wordIndex = dateCode % WORDS.length;
  
  return WORDS[wordIndex];
};

// Keyboard layout
const KEYBOARD = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
];

export default function FinalWordleGame() {
  const params = useLocalSearchParams();
  const { alarmId } = params;
  
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState<{[key: string]: string}>({});
  const [timeLeft, setTimeLeft] = useState(90); // 90 seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
  
  // Initialize the game
  useEffect(() => {
    const word = getWordOfTheDay();
    setTargetWord(word);
    console.log('Target word:', word); // For debugging
  }, []);
  
  // Add timer effect
  useEffect(() => {
    // Start the timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up
          clearInterval(timerRef.current as NodeJS.Timeout);
          
          // Show alert and then return to alarm
          Alert.alert('Time\'s Up!', 'You ran out of time.', [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to alarm
                router.replace({
                  pathname: '/alarm-ring',
                  params: { alarmId: params.alarmId }
                });
              } 
            }
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up timer
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // Reset timer on successful guess
  const resetTimer = () => {
    setTimeLeft(90); // Reset to 90 seconds
  };
  
  // Handle key press
  const handleKeyPress = (key: string) => {
    if (gameOver) return;
    
    if (key === 'DEL') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        Alert.alert('Word must be 5 letters');
        return;
      }
      
      // Check if the guess is correct
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      
      // Update keyboard status
      const newStatus = {...keyboardStatus};
      for (let i = 0; i < currentGuess.length; i++) {
        const letter = currentGuess[i];
        
        if (letter === targetWord[i]) {
          newStatus[letter] = 'correct';
        } else if (targetWord.includes(letter) && newStatus[letter] !== 'correct') {
          newStatus[letter] = 'present';
        } else if (!targetWord.includes(letter)) {
          newStatus[letter] = 'absent';
        }
      }
      setKeyboardStatus(newStatus);
      
      // Check if the game is over
      if (currentGuess === targetWord) {
        setGameOver(true);
        setShowConfetti(true);
        setShowSuccess(true);
        
        // Play sound instead of vibration
        playCompleteSound();
        
        // Animate the success message
        Animated.sequence([
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.delay(2000),
          Animated.timing(successOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          })
        ]).start();
        
        // Show alert after a delay to allow confetti to be seen
        setTimeout(() => {
          Alert.alert('Congratulations!', 'You guessed the word!', [
            { text: 'OK', onPress: () => completeGame(true) }
          ]);
        }, 2500);
      } else if (newGuesses.length >= 6) {
        setGameOver(true);
        Alert.alert('Game Over', `The word was ${targetWord}`, [
          { text: 'Try Again', onPress: () => resetGame() }
        ]);
      } else {
        // Reset timer on successful guess
        resetTimer();
      }
      
      // Add subtle vibration feedback for correct letters
      let correctLetters = 0;
      for (let i = 0; i < currentGuess.length; i++) {
        if (currentGuess[i] === targetWord[i]) {
          correctLetters++;
        }
      }
      
      // Vibrate based on how many letters are correct
      if (correctLetters > 0) {
        // Create a vibration pattern based on correct letters
        const pattern = [];
        for (let i = 0; i < correctLetters; i++) {
          pattern.push(0, 40); // 0ms delay, 40ms vibration
        }
        Vibration.vibrate(pattern);
      }
      
      setCurrentGuess('');
    } else if (currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  };
  
  // Reset the game
  const resetGame = () => {
    const word = getWordOfTheDay();
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setKeyboardStatus({});
  };
  
  // Complete the game and return to alarm
  const completeGame = async (success: boolean) => {
    // Clear the timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (success) {
      try {
        // Play success sound if available
        if (completeSound) {
          await completeSound.playAsync();
        }
        
        // Show success message and confetti
        setShowSuccess(true);
        setShowConfetti(true);
        
        // Animate success message
        Animated.sequence([
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.delay(1500),
          Animated.timing(successOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          })
        ]).start();
        
        // Use direct navigation with setTimeout instead of animation callback
        console.log('Setting up navigation timeout for Wordle');
        setTimeout(() => {
          console.log('Direct navigation timeout fired - going to home screen from Wordle');
          // Use the same navigation method as Tetris
          router.navigate('/(tabs)');
        }, 3000);
        
      } catch (error) {
        console.error('Error in completeGame:', error);
        // Use the same navigation method as Tetris for error case
        router.navigate('/(tabs)');
      }
    } else {
      // If mission failed, use the same navigation method as Tetris
      router.navigate('/(tabs)');
    }
  };
  
  // Get the color for a letter in a guess
  const getLetterColor = (letter: string, index: number, guessIndex: number) => {
    if (guessIndex >= guesses.length) return styles.emptyCell;
    
    if (letter === targetWord[index]) {
      return styles.correctCell;
    } else if (targetWord.includes(letter)) {
      return styles.presentCell;
    } else {
      return styles.absentCell;
    }
  };
  
  // Get the color for a key
  const getKeyColor = (key: string) => {
    if (key === 'ENTER' || key === 'DEL') return styles.specialKey;
    
    switch (keyboardStatus[key]) {
      case 'correct':
        return styles.correctKey;
      case 'present':
        return styles.presentKey;
      case 'absent':
        return styles.absentKey;
      default:
        return styles.key;
    }
  };
  
  // Add a function to load the sound
  useEffect(() => {
    const loadSounds = async () => {
      try {
        console.log('Loading Wordle completion sound...');
        
        // Load completion sound
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/mount.caf'),
          { volume: 1.0 }
        );
        setCompleteSound(sound);
        
        console.log('Wordle sound loaded successfully');
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };
    
    loadSounds();
    
    // Clean up when component unmounts
    return () => {
      if (completeSound) {
        completeSound.unloadAsync();
      }
    };
  }, []);

  // Add a function to play the sound
  const playCompleteSound = async () => {
    try {
      if (completeSound) {
        await completeSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing complete sound:', error);
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      
      <View style={[styles.container, { paddingTop: 60 }]}>
        {/* Success message */}
        {showSuccess && (
          <Animated.View style={[styles.successContainer, { opacity: successOpacity }]}>
            <Text style={styles.successText}>MISSION COMPLETE!</Text>
          </Animated.View>
        )}
        
        {/* Confetti cannon */}
        {showConfetti && (
          <ConfettiCannon
            count={200}
            origin={{x: width/2, y: 0}}
            explosionSpeed={350}
            fallSpeed={3000}
            colors={['#538d4e', '#b59f3b', '#fff', '#ffcc00']}
          />
        )}
        
        {/* Timer at the top */}
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        
        {/* Game board */}
        <View style={styles.board}>
          {Array(6).fill(null).map((_, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {Array(5).fill(null).map((_, colIndex) => {
                const letter = rowIndex < guesses.length 
                  ? guesses[rowIndex][colIndex] 
                  : (rowIndex === guesses.length && colIndex < currentGuess.length)
                    ? currentGuess[colIndex]
                    : '';
                
                return (
                  <View 
                    key={colIndex} 
                    style={[
                      styles.cell,
                      letter ? styles.filledCell : styles.emptyCell,
                      rowIndex < guesses.length ? getLetterColor(letter, colIndex, rowIndex) : null
                    ]}
                  >
                    <Text style={styles.cellText}>{letter}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        
        {/* Keyboard moved up */}
        <View style={styles.keyboard}>
          {KEYBOARD.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyboardRow}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    key === 'ENTER' || key === 'DEL' ? styles.wideKey : null,
                    getKeyColor(key)
                  ]}
                  onPress={() => handleKeyPress(key)}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const { width, height } = Dimensions.get('window');
const cellSize = Math.min(width / 6, 50);
const keyWidth = Math.min((width - 70) / 10, 30);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121213',
    alignItems: 'center',
    paddingTop: 40, // Add padding at the top
    paddingBottom: 20, // Add padding at the bottom
  },
  timerContainer: {
    marginBottom: 10,
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  board: {
    flex: 1, // Make the board take available space
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  cell: {
    width: cellSize,
    height: cellSize,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  emptyCell: {
    borderColor: '#3a3a3c',
  },
  filledCell: {
    borderColor: '#565758',
  },
  correctCell: {
    backgroundColor: '#538d4e',
    borderColor: '#538d4e',
  },
  presentCell: {
    backgroundColor: '#b59f3b',
    borderColor: '#b59f3b',
  },
  absentCell: {
    backgroundColor: '#3a3a3c',
    borderColor: '#3a3a3c',
  },
  cellText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyboard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 20, // Add margin at the bottom
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  key: {
    backgroundColor: '#818384',
    height: Math.min(50, height / 15),
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    minWidth: keyWidth,
  },
  wideKey: {
    minWidth: keyWidth * 1.3,
  },
  keyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  specialKey: {
    backgroundColor: '#565758',
  },
  correctKey: {
    backgroundColor: '#538d4e',
  },
  presentKey: {
    backgroundColor: '#b59f3b',
  },
  absentKey: {
    backgroundColor: '#3a3a3c',
  },
  successContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  successText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#538d4e',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 