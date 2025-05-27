import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';

const { width } = Dimensions.get('window');

// Sleep facts with scientific backing
const sleepFacts = [
  {
    id: '1',
    fact: '1 hour of sleep is one less day at the hospital at the end of life.',
    source: 'Harvard Medical School, 2018'
  },
  {
    id: '2',
    fact: 'Chronic short sleep (<6 hrs) increases colon cancer risk by 50%.',
    source: 'University of Chicago, 2011'
  },
  {
    id: '3',
    fact: 'Sleep-deprived brains build up β-amyloid, the toxic protein linked to Alzheimer\'s.',
    source: 'NIH, 2013'
  },
  {
    id: '4',
    fact: 'In just 1 week of under-sleeping, 711 genes are disrupted — many involved in inflammation, stress, and immune suppression.',
    source: 'PNAS, 2013'
  },
  {
    id: '5',
    fact: 'Lack of sleep raises risk of heart disease by 48% and stroke by 15%.',
    source: 'European Heart Journal, 2011'
  },
  {
    id: '6',
    fact: 'Every hour, someone dies in a car crash caused by a sleep-deprived driver.',
    source: 'CDC, 2017'
  },
  {
    id: '7',
    fact: 'Losing just 1 hour of sleep increases crash risk by 400% — the same as being legally drunk.',
    source: 'AAA Foundation'
  },
  {
    id: '8',
    fact: 'Your pain threshold drops significantly with poor sleep — even mild pain feels worse.',
    source: 'Sleep, 2012'
  },
  {
    id: '9',
    fact: 'With 6 hours of sleep or less, your body produces more hunger hormone (ghrelin) and less satiety hormone (leptin) — making you crave sugar and fat.',
    source: 'PLOS Medicine, 2004'
  },
  {
    id: '10',
    fact: 'Sleep-deprived people consume ~385 extra calories/day, often without realizing it. That\'s a pound of fat gained every 9 days.',
    source: 'American Journal of Clinical Nutrition, 2016'
  },
  {
    id: '11',
    fact: 'Poor sleep leads to worse skin, slower healing, and accelerated aging — even your wounds take longer to close.',
    source: 'Journal of Clinical & Experimental Dermatology'
  },
  {
    id: '12',
    fact: 'People who sleep poorly are 80% more likely to suffer from depression.',
    source: 'Sleep Medicine Reviews, 2008'
  }
];

export default function SleepFactsScreen() {
  const requestAppReview = async () => {
    try {
      // First show our custom message
      Alert.alert(
        "Help others sleep better.",
        "It helps us reach more people to spread the message of better sleep.",
        [
          { 
            text: "Rate 5 Stars",
            onPress: async () => {
              // Use the native StoreReview API - this shows the in-app rating dialog
              await StoreReview.requestReview();
              
              // Continue to next screen after a short delay
              setTimeout(() => {
                router.push('/quiz/study');
              }, 1500);
            },
            style: "default", 
          },
          {
            text: "Maybe Later",
            onPress: () => router.push('/quiz/study'),
            style: "cancel", 
          }
        ]
      );
    } catch (error) {
      console.error('Error in review flow:', error);
      router.push('/quiz/study');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>
            Did you know?
          </Text>
          
          {/* Sleep facts list */}
          {sleepFacts.map((item) => (
            <View key={item.id} style={styles.factCard}>
              <Text style={styles.factText}>{item.fact}</Text>
              <Text style={styles.factSource}>{item.source}</Text>
            </View>
          ))}
        </ScrollView>
        
        {/* Sticky button */}
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={requestAppReview}
          >
            <Text style={styles.buttonText}>Help us spread the message</Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="star" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Add padding to prevent content from being hidden behind sticky button
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 25,
    textAlign: 'center',
  },
  factCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  factText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: '500',
  },
  factSource: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  // Sticky button styles
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#0A84FF', // Blue button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff', // White text on blue button
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 