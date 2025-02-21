import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function MissionLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack>
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
      </Stack>
    </View>
  );
} 