import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TypingPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [inputText, setInputText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const timerAnimation = useRef(new Animated.Value(0)).current;
  const phrase = (params.phrase as string).replace(/'/g, "'");

  const TIMER_DURATION = 20000; // 20 seconds

  const startTimer = () => {
    timerAnimation.stopAnimation();
    timerAnimation.setValue(0);
    
    Animated.timing(timerAnimation, {
      toValue: 1,
      duration: TIMER_DURATION,
      useNativeDriver: false,
    }).start(() => {
      startTimer();
    });
  };

  useEffect(() => {
    startTimer();
  }, []);

  useEffect(() => {
    if (inputText !== phrase) {
      startTimer();
    }
  }, [inputText]);

  useEffect(() => {
    if (inputText === phrase) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
      setTimeout(() => {
        router.push({
          pathname: '/mission/typing',
          params: {
            ...params,
            phrase: phrase,
            isPreviewComplete: 'true'  // Convert boolean to string
          }
        });
      }, 1500);
    }
  }, [inputText]);

  const renderText = () => {
    const maxLength = Math.max(inputText.length, phrase.length);
    return Array.from({ length: maxLength }).map((_, index) => {
      let color = '#666';
      let letterToShow = phrase[index] || ' ';
      
      if (index < inputText.length) {
        letterToShow = inputText[index];
        if (index < phrase.length) {
          color = inputText[index] === phrase[index] ? '#4CAF50' : '#FF5252';
        } else {
          color = '#FF5252';
        }
      }
      
      return (
        <Text key={index} style={[styles.letter, { color }]}>
          {letterToShow}
        </Text>
      );
    });
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.successText}>Well Done! 🎉</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.timerContainer}>
        <Animated.View 
          style={[
            styles.timerBar,
            {
              width: timerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['100%', '0%']
              })
            }
          ]}
        />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.counter}>
              {inputText.length} / {phrase.length}
            </Text>
          </View>

          <View style={styles.phraseContainer}>
            <View style={styles.letterContainer}>
              {renderText()}
            </View>
          </View>

          <TextInput
            style={styles.hiddenInput}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  counter: {
    color: '#666',
    fontSize: 18,
  },
  phraseContainer: {
    alignItems: 'center',
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
  successText: {
    color: '#4CAF50',
    fontSize: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 40,
  }
}); 