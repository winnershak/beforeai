import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddJournalEntry() {
  const params = useLocalSearchParams();
  const wakeUpTime = params.time as string;
  
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState('😊');
  const [saving, setSaving] = useState(false);

  const moods = ['😊', '🌟', '💪', '🔥', '✨', '🎉', '😴', '😅'];

  const saveJournalEntry = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving journal entry...');
      
      const entry = {
        id: Date.now().toString(),
        wakeUpTime,
        message: message.trim(),
        mood,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        createdAt: new Date().toISOString(),
      };

      console.log('📝 Entry to save:', entry);

      // Save to local storage (you can later sync to Firebase)
      const existingEntries = await AsyncStorage.getItem('journalEntries');
      const entries = existingEntries ? JSON.parse(existingEntries) : [];
      entries.unshift(entry); // Add to beginning
      
      await AsyncStorage.setItem('journalEntries', JSON.stringify(entries));
      console.log('✅ Journal entry saved successfully');
      
      Alert.alert('Success', 'Journal entry saved!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('❌ Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Morning Journal</Text>
        <TouchableOpacity onPress={saveJournalEntry} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.wakeUpInfo}>
          <Text style={styles.wakeUpTime}>⏰ {wakeUpTime}</Text>
          <Text style={styles.wakeUpDate}>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodSelector}>
            {moods.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.moodButton, mood === emoji && styles.moodButtonActive]}
                onPress={() => setMood(emoji)}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your morning? (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Write about your morning, how you feel, or your goals for today..."
            placeholderTextColor="#666"
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{message.length}/300</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.previewTitle}>Preview:</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewMood}>{mood}</Text>
              <Text style={styles.previewTime}>{wakeUpTime}</Text>
            </View>
            {message.trim() && (
              <Text style={styles.previewMessage}>{message}</Text>
            )}
            <Text style={styles.previewDate}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  wakeUpInfo: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
  },
  wakeUpTime: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  wakeUpDate: {
    color: '#999',
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonActive: {
    backgroundColor: '#007AFF',
  },
  moodEmoji: {
    fontSize: 24,
  },
  messageInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    color: '#666',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
  },
  previewTitle: {
    color: '#999',
    fontSize: 16,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewMood: {
    fontSize: 24,
  },
  previewTime: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewMessage: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  previewDate: {
    color: '#666',
    fontSize: 14,
  },
});
