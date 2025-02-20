import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function MathPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentProblem, setCurrentProblem] = useState(1);
  const [answer, setAnswer] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const difficulty = params.difficulty as string;
  const times = parseInt(params.times as string);

  // Timer duration in milliseconds (20 seconds)
  const TIMER_DURATION = 20000;

  // Start timer when component mounts and when problem changes
  useEffect(() => {
    startTimer();
    return () => cleanupTimer();
  }, [currentProblem]);

  const startTimer = () => {
    cleanupTimer(); // Clean up any existing timer
    timerAnimation.setValue(0);
    timerRef.current = Animated.timing(timerAnimation, {
      toValue: 1,
      duration: TIMER_DURATION,
      useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) {
        handleTimeExpired();
      }
    });
  };

  const cleanupTimer = () => {
    if (timerRef.current) {
      timerRef.current.stop();
      timerAnimation.setValue(0);
    }
  };

  // Handle back button
  const handleBack = () => {
    cleanupTimer();
    router.back();
  };

  // Handle exit preview
  const handleExitPreview = () => {
    cleanupTimer();
    router.push('/mission/math');
  };

  const handleTimeExpired = async () => {
    setTimeExpired(true);
    cleanupTimer();
    setTimeout(() => {
      router.push('/mission/alarm-preview', params);
    }, 1000);
  };

  const width = timerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  const generateProblem = () => {
    switch(difficulty) {
      case 'easy':
        const num1 = Math.floor(Math.random() * 10);
        const num2 = Math.floor(Math.random() * 10);
        return { numbers: [num1, num2], answer: num1 + num2 };
      case 'medium':
        const num3 = Math.floor(Math.random() * 20) + 10;
        const num4 = Math.floor(Math.random() * 10);
        return { numbers: [num3, num4], answer: num3 + num4 };
      case 'hard':
        const num5 = Math.floor(Math.random() * 50) + 20;
        const num6 = Math.floor(Math.random() * 50) + 20;
        return { numbers: [num5, num6], answer: num5 + num6 };
      default:
        return { numbers: [3, 7], answer: 10 };
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
        setCurrentProblem(prev => prev + 1);
        setProblem(generateProblem());
        setAnswer('');
      } else {
        cleanupTimer();
        setShowCompletion(true);
        setTimeout(() => {
          router.push('/mission/math');
        }, 2000);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      {showCompletion ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>WELL DONE!</Text>
          <Text style={styles.completionSubText}>Mission Complete</Text>
        </View>
      ) : timeExpired ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>Time's Up!</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.progress}>{currentProblem} / {times}</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.soundToggle}>🔇</Text>
            </TouchableOpacity>
          </View>

          {/* Timer Progress Line */}
          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerLine,
                {
                  width: timerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%'],
                  }),
                }
              ]} 
            />
          </View>

          <View style={styles.problemContainer}>
            <Text style={styles.equation}>
              {problem.numbers[0]}+{problem.numbers[1]}
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
            style={styles.exitPreview}
            onPress={handleExitPreview}
          >
            <Text style={styles.exitPreviewText}>EXIT PREVIEW</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    color: '#fff',
    fontSize: 24,
  },
  progress: {
    color: '#fff',
    fontSize: 18,
  },
  soundToggle: {
    fontSize: 24,
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
  exitPreview: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  exitPreviewText: {
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: '#333',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  timerLine: {
    height: '100%',
    backgroundColor: '#ff3b30',
  },
  timeUpText: {
    color: '#ff3b30',
    fontSize: 48,
    fontWeight: 'bold',
  },
}); 