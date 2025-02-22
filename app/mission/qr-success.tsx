import React, { useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function QRSuccess() {
  const router = useRouter();

  useEffect(() => {
    Vibration.vibrate();
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { missionComplete: 'true' }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn} style={styles.successContent}>
          <Ionicons name="checkmark-circle-outline" size={100} color="#4CD964" />
          <Text style={styles.title}>Mission Complete!</Text>
        </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
}); 