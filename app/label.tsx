import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LabelScreen() {
  const params = useLocalSearchParams();
  const [label, setLabel] = useState(params.currentLabel as string || '');

  const handleSave = () => {
    router.navigate({
      pathname: '/new-alarm',
      params: { newLabel: label }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Label</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Enter label"
        placeholderTextColor="#666"
        autoFocus
      />
    </View>
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
    paddingTop: 60,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  saveText: {
    color: '#0A84FF',
    fontSize: 17,
  },
  input: {
    color: '#fff',
    fontSize: 17,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
}); 