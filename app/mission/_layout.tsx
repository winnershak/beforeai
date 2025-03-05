import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function MissionLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerShown: false, // Hide all headers by default
          gestureEnabled: false, // Prevents swipe back gesture
          contentStyle: { backgroundColor: 'transparent' }, // Make background transparent
        }}
      >
        {/* List all screens with headerShown explicitly set to false */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="math" options={{ headerShown: false }} />
        <Stack.Screen name="typing" options={{ headerShown: false }} />
        <Stack.Screen name="mathpreview" options={{ headerShown: false }} />
        <Stack.Screen name="mathmission" options={{ headerShown: false }} />
        <Stack.Screen name="typingpreview" options={{ headerShown: false }} />
        <Stack.Screen name="typingphrases" options={{ headerShown: false }} />
        <Stack.Screen name="typingmission" options={{ headerShown: false }} />
        <Stack.Screen name="typing-alarm-preview" options={{ headerShown: false }} />
        <Stack.Screen name="qrcode" options={{ headerShown: false }} />
        <Stack.Screen name="qr-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="wordle-standalone" options={{ 
          headerShown: false,
          gestureEnabled: false,
          header: () => null, // Explicitly set header to null
        }} />
      </Stack>
    </View>
  );
} 