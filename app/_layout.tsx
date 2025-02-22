import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAlarmManager } from './hooks/useAlarmManager';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useAlarmManager(); // This will check for active alarms on app launch

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerBackTitle: '',
          headerTitle: '',
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#000',
          },
        }}>
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false 
            }} 
          />
          <Stack.Screen 
            name="new-alarm" 
            options={{
              title: 'New Alarm',
              headerLargeTitle: false,
              headerTitleStyle: {
                fontSize: 17,
                fontWeight: '600',
              },
            }}
          />
          <Stack.Screen 
            name="missionselector" 
            options={{
              title: 'Choose Mission',
              presentation: 'card',
              headerLargeTitle: false,
              headerTitleStyle: {
                fontSize: 17,
                fontWeight: '600',
              },
            }}
          />
          <Stack.Screen name="mission/photo" options={{ title: 'Photo' }} />
          <Stack.Screen name="mission/photo-scanner" options={{ headerShown: false }} />
          <Stack.Screen name="mission/photo-preview" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
