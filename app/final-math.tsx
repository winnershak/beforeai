import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const alarmSounds = {
  'Orkney': require('../assets/sounds/orkney.caf'),
  'Radar': require('../assets/sounds/radar.caf'),
  'Beacon': require('../assets/sounds/beacon.caf'),
  'Chimes': require('../assets/sounds/chimes.caf'),
  'Circuit': require('../assets/sounds/circuit.caf'),
  'Reflection': require('../assets/sounds/reflection.caf'),
};

export default function MathMission() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentProblem, setCurrentProblem] = useState(1);
  const [answer, setAnswer] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  
  // Initialize animation value at 100% width
  const timerWidth = useRef(new Animated.Value(100)).current;
  
  // Helper function to normalize difficulty values
  const normalizeDifficulty = (diffValue: any): string => {
    // Convert from numeric index to string value
    if (diffValue === '1' || diffValue === 1) return 'easy';
    if (diffValue === '2' || diffValue === 2) return 'medium';
    if (diffValue === '3' || diffValue === 3) return 'hard';
    
    // Return as-is if it's already one of our expected values
    if (['easy', 'medium', 'hard'].includes(String(diffValue))) {
      return String(diffValue);
    }
    
    // Default to medium if invalid
    console.log(`Normalizing unexpected difficulty value: ${diffValue} -> medium`);
    return 'medium';
  };
  
  const [difficulty, setDifficulty] = useState('medium');
  const [times, setTimes] = useState(3);
  const [timeLimit, setTimeLimit] = useState(30); // Default 30 seconds
  
  // Add sound handling
  const [selectedSound, setSelectedSound] = useState(params.sound as string || 'Orkney');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Add this to track whether we want the sound to play
  const [shouldPlaySound, setShouldPlaySound] = useState(false);

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Set shouldPlaySound to false to disable sound during missions
    setShouldPlaySound(false);
    
    // Load settings and prepare mission, but don't load sound
    // ...existing code to load mission settings...
    
    // Clean up function to ensure sound is stopped
    return () => {
      console.log('Component unmounting - ensuring sound is stopped');
      stopSound();
    };
  }, []);

  // Add a separate useEffect to handle sound changes
  useEffect(() => {
    // Ensure sound is stopped when component mounts
    stopSound();
    
    // No need to load sound since we've disabled it
    
    return () => {
      // Also clean up when sound reference changes
      if (sound) {
        console.log('Sound reference changed - cleaning up old sound');
        sound.stopAsync().catch(console.error);
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  // Load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get time limit from params
        const timeLimitParam = params.timeLimit;
        console.log('Time limit param:', timeLimitParam);
        
        let parsedTimeLimit = 30; // Default
        if (timeLimitParam) {
          parsedTimeLimit = parseInt(timeLimitParam as string, 10);
          if (isNaN(parsedTimeLimit)) {
            parsedTimeLimit = 30;
          }
        }
        
        console.log('Using time limit:', parsedTimeLimit, 'seconds');
        setTimeLimit(parsedTimeLimit);
        
        // Get difficulty and times from params
        const difficultyParam = params.difficulty;
        const timesParam = params.times;
        
        // Load difficulty - normalize to ensure correct format
        const normalizedDifficulty = normalizeDifficulty(difficultyParam || 'medium');
        console.log(`Setting difficulty: ${difficultyParam} -> ${normalizedDifficulty}`);
        setDifficulty(normalizedDifficulty);
        
        // Load times
        const parsedTimes = timesParam ? parseInt(timesParam as string, 10) : 3;
        if (!isNaN(parsedTimes)) {
          setTimes(parsedTimes);
        }
        
        console.log('Mission settings:', {
          timeLimit: parsedTimeLimit,
          difficulty: normalizedDifficulty,
          times: parsedTimes
        });
        
        // Start the timer after settings are loaded
        startTimerAnimation(parsedTimeLimit);
        
      } catch (error) {
        console.error('Error loading settings:', error);
        // Start with default time if there's an error
        startTimerAnimation(30);
      }
    };
    
    loadSettings();
    
    // Also load saved settings if needed
    const loadSavedSettings = async () => {
      try {
        const savedDifficulty = await AsyncStorage.getItem('mathDifficulty');
        const savedTimes = await AsyncStorage.getItem('mathTimes');
        
        console.log('Loading saved math settings:', {
          difficulty: savedDifficulty,
          times: savedTimes
        });
        
        if (savedDifficulty) {
          const normalizedDifficulty = normalizeDifficulty(savedDifficulty);
          console.log(`Normalizing saved difficulty: ${savedDifficulty} -> ${normalizedDifficulty}`);
          setDifficulty(normalizedDifficulty);
        }
        
        if (savedTimes) {
          const parsedTimes = parseInt(savedTimes, 10);
          if (!isNaN(parsedTimes)) {
            setTimes(parsedTimes);
          }
        }
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    };
    
    loadSavedSettings();
    
    return () => {
      // Cleanup
      stopSound();
    };
  }, []);

  // Start timer animation function
  const startTimerAnimation = (seconds: number) => {
    console.log(`Starting timer animation for ${seconds} seconds`);
    
    // Reset to full width
    timerWidth.setValue(100);
    
    // Animate to zero width over timeLimit in milliseconds
    Animated.timing(timerWidth, {
      toValue: 0,
      duration: seconds * 1000, // Convert seconds to milliseconds
      useNativeDriver: false
    }).start(({finished}) => {
      if (finished) {
        console.log('Timer animation finished');
        handleTimeExpired();
      } else {
        console.log('Timer animation was interrupted');
      }
    });
  };

  const handleTimeExpired = async () => {
    console.log('Time expired, redirecting to alarm-ring');
    setTimeExpired(true);
    
    // Stop sound when time expires
    await stopSound();
    
    // Return to alarm-ring when time expires
    setTimeout(() => {
      router.push({
        pathname: '/alarm-ring',
        params: {
          sound: params.sound,
          soundVolume: params.soundVolume,
          hasMission: 'true',
          alarmId: params.alarmId
        }
      });
    }, 1000);
  };
  
  // Reset timer when moving to next problem
  useEffect(() => {
    // Only restart timer for subsequent problems, not the first one
    if (currentProblem > 1) {
      console.log('Starting timer for problem', currentProblem);
      startTimerAnimation(timeLimit);
    }
  }, [currentProblem, timeLimit]);

  const generateProblem = () => {
    // Log the current difficulty to help debug
    console.log('Generating problem with difficulty:', difficulty);
    
    // Make sure we use correct difficulty format
    const normalizedDifficulty = normalizeDifficulty(difficulty);
    if (normalizedDifficulty !== difficulty) {
      console.log(`Normalized difficulty for problem generation: ${difficulty} -> ${normalizedDifficulty}`);
    }
    
    switch(normalizedDifficulty) {
      case 'easy':
        // Easy: simple addition with small numbers
        const num1 = Math.floor(Math.random() * 10);
        const num2 = Math.floor(Math.random() * 10);
        console.log(`Easy problem generated: ${num1} + ${num2} = ${num1 + num2}`);
        return { numbers: [num1, num2], operation: '+', answer: num1 + num2 };
        
      case 'medium':
        // Medium: larger numbers for addition
        const num3 = Math.floor(Math.random() * 20) + 10; // 10-29
        const num4 = Math.floor(Math.random() * 10) + 1;  // 1-10
        console.log(`Medium problem generated: ${num3} + ${num4} = ${num3 + num4}`);
        return { numbers: [num3, num4], operation: '+', answer: num3 + num4 };
        
      case 'hard':
        // Hard: either large number addition or multiplication
        if (Math.random() > 0.5) {
          // Large number addition
          const num5 = Math.floor(Math.random() * 50) + 20; // 20-69
          const num6 = Math.floor(Math.random() * 50) + 20; // 20-69
          console.log(`Hard addition problem: ${num5} + ${num6} = ${num5 + num6}`);
          return { numbers: [num5, num6], operation: '+', answer: num5 + num6 };
        } else {
          // Multiplication
          const num7 = Math.floor(Math.random() * 10) + 2; // 2-11
          const num8 = Math.floor(Math.random() * 10) + 2; // 2-11
          console.log(`Hard multiplication problem: ${num7} × ${num8} = ${num7 * num8}`);
          return { numbers: [num7, num8], operation: '×', answer: num7 * num8 };
        }
        
      default:
        // This should never happen with normalization, but provide a fallback
        console.warn('Using default difficulty - this should not happen!');
        const fallbackNum1 = Math.floor(Math.random() * 10);
        const fallbackNum2 = Math.floor(Math.random() * 10);
        return { numbers: [fallbackNum1, fallbackNum2], operation: '+', answer: fallbackNum1 + fallbackNum2 };
    }
  };

  const [problem, setProblem] = useState(generateProblem());

  const handleNumber = (num: string) => {
    if (answer.length < 3) {
      setAnswer(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setAnswer(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (parseInt(answer) === problem.answer) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (currentProblem < times) {
        // Log before generating new problem
        console.log(`Problem ${currentProblem} completed. Current difficulty: ${difficulty}`);
        
        // Generate new problem before updating current problem counter
        const newProblem = generateProblem();
        
        // Update state in this order to preserve difficulty
        setProblem(newProblem);
        setAnswer('');
        setCurrentProblem(prev => prev + 1);
      } else {
        console.log('All problems completed, mission successful');
        await stopSound();
        setShowCompletion(true);
        
        // Clear the active alarm
        await AsyncStorage.removeItem('activeAlarm');
        
        // Navigate home after showing completion
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDone = async () => {
    console.log('Math Mission - handleDone called');
    try {
      // Save mission type and math settings
      console.log('Saving math settings:', {
        difficulty: difficulty,
        times: times
      });
      
      await AsyncStorage.setItem('selectedMissionType', 'Math');
      await AsyncStorage.setItem('mathDifficulty', difficulty);
      await AsyncStorage.setItem('mathTimes', times.toString());
      
      // Verify saves immediately
      const savedType = await AsyncStorage.getItem('selectedMissionType');
      const savedDifficulty = await AsyncStorage.getItem('mathDifficulty');
      const savedTimes = await AsyncStorage.getItem('mathTimes');
      
      console.log('Math settings saved:', {
        type: savedType,
        difficulty: savedDifficulty,
        times: savedTimes
      });
      
      router.push('/new-alarm');
    } catch (error) {
      console.error('Error in handleDone:', error);
    }
  };

  const stopSound = async () => {
    try {
      console.log('Stopping math mission sound');
      if (sound) {
        await sound.stopAsync().catch(err => console.error('Error stopping sound:', err));
        await sound.unloadAsync().catch(err => console.error('Error unloading sound:', err));
        console.log('Sound stopped and unloaded successfully');
      }
      setSound(null);
    } catch (error) {
      console.error('Error in stopSound function:', error);
    }
  };

  const handleMissionComplete = async () => {
    try {
      console.log('Math mission completed - stopping any sounds');
      
      // Stop any playing sounds
      await stopSound();
      
      // Mark the mission as completed
      // ...existing code...
      
      // Navigate to success screen or home
      console.log('Math mission complete - navigating to home');
      router.replace('/');
    } catch (error) {
      console.error('Error completing mission:', error);
      await stopSound();
      router.replace('/');
    }
  };

  // Initialize settings (but not a new timer)
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Get time limit from params
        const timeLimitParam = params.timeLimit;
        console.log('Time limit from params:', timeLimitParam);
        
        let timeLimit = 30; // Default
        if (timeLimitParam) {
          const parsedTimeLimit = parseInt(timeLimitParam as string, 10);
          if (!isNaN(parsedTimeLimit)) {
            timeLimit = parsedTimeLimit;
          }
        }
        
        console.log('Using time limit:', timeLimit);
        
        // Disable sound during mission
        setShouldPlaySound(false);
        await stopSound();
        
        // Set up animation for progress bar that syncs with the existing timer
        // Start the animation from 1 (100%) to 0 (0%) over the time limit
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: timeLimit * 1000,
          useNativeDriver: false
        }).start();
        
        // Load other mission settings
        // ... existing code to load mission settings ...
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };
    
    initializeSettings();
    
    return () => {
      stopSound();
    };
  }, []);

  return (
    <View style={styles.container}>
      {showCompletion ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>WELL DONE!</Text>
          <Text style={styles.completionSubText}>Alarm Dismissed</Text>
        </View>
      ) : timeExpired ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>Time's Up!</Text>
          <Text style={styles.completionSubText}>Try Again</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.progress}>{currentProblem} / {times}</Text>
          </View>

          {/* Timer bar with simplified animation */}
          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerLine,
                { width: timerWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>

          <View style={styles.problemContainer}>
            <Text style={styles.equation}>
              {problem.numbers[0]}{problem.operation || '+'}{problem.numbers[1]}
            </Text>
            <View style={styles.answerBox}>
              <Text style={styles.answerText}>{answer}</Text>
            </View>
          </View>

          <View style={styles.keypad}>
            {[
              ['1', '2', '3', 'delete'],
              ['4', '5', '6', 'submit'],
              ['7', '8', '9', ''],
              ['', '0', '', ''],
            ].map((row, i) => (
              <View key={i} style={styles.keypadRow}>
                {row.map((key, j) => (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.key,
                      key === 'submit' && styles.submitKey,
                      key === '' && styles.emptyKey,
                    ]}
                    onPress={() => {
                      if (key === 'delete') handleDelete();
                      else if (key === 'submit') handleSubmit();
                      else if (key !== '') handleNumber(key);
                    }}
                  >
                    {key === 'delete' ? (
                      <Text style={styles.keyText}>✕</Text>
                    ) : key === 'submit' ? (
                      <Text style={styles.keyText}>✓</Text>
                    ) : (
                      <Text style={styles.keyText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  progress: {
    color: '#fff',
    fontSize: 18,
  },
  problemContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  equation: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  answerBox: {
    width: '80%',
    height: 60,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  answerText: {
    color: '#fff',
    fontSize: 36,
  },
  keypad: {
    padding: 20,
    marginTop: 40,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  key: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitKey: {
    backgroundColor: '#ff3b30',
  },
  emptyKey: {
    backgroundColor: 'transparent',
  },
  keyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  completionText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  completionSubText: {
    color: '#666',
    fontSize: 24,
  },
  timerContainer: {
    height: 3,
    width: '100%',
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
  },
  timerLine: {
    height: '100%',
    backgroundColor: '#ff3b30',
  },
  doneButton: {
    backgroundColor: '#ff3b30',
    padding: 20,
    alignItems: 'center',
    borderRadius: 10,
  },
  doneText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 