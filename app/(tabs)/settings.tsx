import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const navigateTo = (route: string) => {
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigateTo('/about')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="information-circle-outline" size={24} color="#5AC8FA" style={styles.settingIcon} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigateTo('/help')}
          >
            <View style={styles.settingContent}>
              <Ionicons name="help-circle-outline" size={24} color="#4CD964" style={styles.settingIcon} />
              <Text style={styles.settingText}>Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
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
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    color: '#fff',
    fontSize: 17,
  },
}); 