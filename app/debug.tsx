import React, { useEffect } from 'react';
import { View, Text, Button, ScrollView, SafeAreaView } from 'react-native';

export default function DebugScreen() {
  useEffect(() => {
    console.log('Debug screen mounted - if you see this, React is working');
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Debug Screen
        </Text>
        <Text style={{ marginBottom: 10 }}>
          If you can see this screen, your React Native is rendering correctly.
        </Text>
        <View style={{ height: 20 }} />
        <Button
          title="Test Button (Will log to console)"
          onPress={() => console.log('Button pressed!')}
        />
      </ScrollView>
    </SafeAreaView>
  );
} 