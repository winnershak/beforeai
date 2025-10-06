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
  const [saving, setSaving] = useState(false);

  const saveJournalEntry = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving journal entry...');
      
      const entry = {
        id: Date.now().toString(),
        wakeUpTime,
        message: message.trim(),
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Header */}
        <Text style={styles.dateHeader}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}
        </Text>

        {/* Wake-up Time Display */}
        <Text style={styles.timeDisplay}>{wakeUpTime}</Text>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your morning?</Text>
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

        {/* Preview matching index design */}
        <View style={styles.section}>
          <Text style={styles.previewTitle}>Preview:</Text>
          <View style={styles.previewCard}>
            <Text style={styles.premiumDate}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            <Text style={styles.premiumTime}>{wakeUpTime}</Text>
            {message.trim() && (
              <Text style={styles.premiumMessage}>{message}</Text>
            )}
          </View>
        </View>
      </ScrollView>
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
  dateHeader: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  timeDisplay: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 32,
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
  messageInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
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
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 0,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // Match the exact styles from index
  premiumDate: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  premiumTime: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 16,
  },
  premiumMessage: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
});
