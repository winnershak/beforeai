// it is a start a mission screen with sound and vibration


import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Vibration } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function PhotoPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetPhoto = params.targetPhoto as string;
  const sound = params.sound as string || 'orkney';
  const soundRef = useRef<Audio.Sound | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (params.success === 'true') {
      stopSound();
      setShowCompletion(true);
      Vibration.vibrate(400);
      setTimeout(() => {
        router.replace({
          pathname: '/(tabs)',
          params: { missionComplete: 'true' }
        });
      }, 2000);
    } else {
      playSound();
    }

    return () => {
      stopSound();
    };
  }, [params.success]);

  const playSound = async () => {
    try {
      const soundFile = {
        'orkney': require('../../assets/sounds/orkney.caf'),
        'radar': require('../../assets/sounds/radar.caf'),
        'reflection': require('../../assets/sounds/reflection.caf'),
        'circuit': require('../../assets/sounds/circuit.caf'),
        'chimes': require('../../assets/sounds/chimes.caf'),
        'beacon': require('../../assets/sounds/beacon.caf'),
      }[sound] || require('../../assets/sounds/orkney.caf');

      const { sound: audioSound } = await Audio.Sound.createAsync(
        soundFile,
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = audioSound;
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
    }
  };

  const handleStartMission = async () => {
    console.log('Starting mission');
    await stopSound();
    router.replace({
      pathname: '/mission/photo-preview',
      params: {
        targetPhoto: targetPhoto,
        sound: params.sound,
        mode: 'compare'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {showCompletion ? (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>WELL DONE!</Text>
          <Text style={styles.completionSubText}>Mission Complete</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={async () => {
              await stopSound();
              router.back();
            }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.missionInfo}>
              <Text style={styles.missionTitle}>Complete Mission</Text>
              <Text style={styles.description}>
                Take a photo to complete your mission. Make sure you have good lighting.
              </Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.startButton} onPress={handleStartMission}>
              <Text style={styles.startButtonText}>Start Mission</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exitButton}
              onPress={async () => {
                await stopSound();
                router.back();
              }}
            >
              <Text style={styles.exitButtonText}>Exit Preview</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  missionInfo: {
    marginTop: 40,
  },
  missionTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 30,
    gap: 10,
  },
  startButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  exitButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
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
}); 