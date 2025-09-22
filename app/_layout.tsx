// console.log('🔧 Emergency error handler setup...');
// try {
//   (global as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal: boolean) => {
//     console.error('💥 CAUGHT CRASH:', error.message);
//     const Alert = require('react-native').Alert;
//     Alert.alert('APP CRASHED', error.message + '\n\nSTACK:\n' + (error.stack || 'No stack'));
//     console.error('Full error:', JSON.stringify(error, null, 2));
//   });
// } catch (e) {
//   console.error('Error handler setup failed:', e);
// }

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ErrorBoundary from './components/ErrorBoundary';
import { useColorScheme } from '@/hooks/useColorScheme';
import RevenueCatService from './services/RevenueCatService';
import { Platform, NativeModules } from 'react-native';
import { registerBackgroundTask } from './background-task';
import * as TaskManager from 'expo-task-manager';
import AlarmSoundModule from './native-modules/AlarmSoundModule';
const { ScreenTimeBridge } = NativeModules;

// SplashScreen.preventAutoHideAsync();

const handleError = (error: Error) => {
  console.log('Caught error:', error);
};

export default function AppLayout() {
  console.log('🚀 AppLayout starting...');
  
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      if (loaded) {
        console.log('✅ Fonts loaded, checking quiz...');
        
        try {
          const quizCompleted = await AsyncStorage.getItem('quizCompleted');
          console.log('📱 Quiz completed:', quizCompleted);
          
          if (quizCompleted === 'true') {
            console.log('➡️ Navigating to tabs');
            router.replace('/(tabs)/');
          } else {
            console.log('➡️ Navigating to quiz');
            router.replace('/quiz');
          }
          
          setLoading(false);
          console.log('✅ Navigation complete');
        } catch (error) {
          console.error('❌ Navigation error:', error);
          setLoading(false);
        }
      }
    };
    
    initializeApp();
  }, [loaded]);

  if (!loaded || loading) {
    return null;
  }

  return (
    <ErrorBoundary onError={handleError}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ThemeProvider value={DefaultTheme}>
          <Stack
            screenOptions={({ navigation }) => ({
              headerStyle: { backgroundColor: '#1C1C1E' },
              headerTintColor: '#fff',
              headerTitleStyle: { color: '#fff' },
              headerLeft: navigation.canGoBack() ? () => (
                <TouchableOpacity 
                  onPress={() => navigation.goBack()}
                  style={{ marginLeft: 10 }}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              ) : undefined,
            })}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/index" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/question1" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/question2" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/question3" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/question4" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/question5" options={{ headerShown: false }} />
            <Stack.Screen name="quiz/yes" options={{ headerShown: false }} />
            <Stack.Screen name="new-alarm" options={{ headerShown: false }} />
            <Stack.Screen name="missionselector" options={{ title: 'Choose Mission' }} />
            <Stack.Screen name="wallpaper-selector" options={{ title: 'Choose Wallpaper' }} />
            <Stack.Screen name="alarm-ring" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="sounds" options={{ headerTitle: "Select Sound" }} />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}