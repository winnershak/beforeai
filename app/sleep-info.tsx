import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SleepInfoScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Time to Wind Down',
          headerStyle: {
            backgroundColor: '#1C1C1E',
          },
          headerTitleStyle: {
            color: '#fff',
          },
          headerTintColor: '#fff',
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Ionicons name="moon" size={40} color="#8E8DF2" />
            <Text style={styles.headerText}>Your Sleep Matters</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Why Put Down Your Phone?</Text>
            <Text style={styles.cardText}>
              Blue light from screens reduces melatonin production, making it harder to fall asleep.
              Using your phone before bed can keep your mind active when it needs to wind down.
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Better Sleep Tips</Text>
            
            <View style={styles.tipRow}>
              <Ionicons name="time-outline" size={24} color="#8E8DF2" />
              <Text style={styles.tipText}>Maintain a consistent sleep schedule</Text>
            </View>
            
            <View style={styles.tipRow}>
              <Ionicons name="book-outline" size={24} color="#8E8DF2" />
              <Text style={styles.tipText}>Read a physical book instead of scrolling</Text>
            </View>
            
            <View style={styles.tipRow}>
              <Ionicons name="water-outline" size={24} color="#8E8DF2" />
              <Text style={styles.tipText}>Stay hydrated but avoid caffeine after 2PM</Text>
            </View>
            
            <View style={styles.tipRow}>
              <Ionicons name="bed-outline" size={24} color="#8E8DF2" />
              <Text style={styles.tipText}>Create a comfortable sleep environment</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>I'll Wind Down Now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#D1D1D6',
    lineHeight: 24,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 16,
    color: '#D1D1D6',
    marginLeft: 10,
    flex: 1,
  },
  button: {
    backgroundColor: '#8E8DF2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 