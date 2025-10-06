import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Updated review data with specific benefits
const reviews = [
  // Physical - Skin 
  {
    id: '1',
    name: 'Sarah J.',
    rating: 5,
    text: 'I used to scroll on Tiktok and Instagram for hours in bed. Now I am finally living up to my potential and it feels incredible! I can focus for hours at work now, and my productivity has doubled.',
    category: 'Physical - Skin',
  },
  // Physical - Body
  {
    id: '2',
    name: 'Michael T.',
    rating: 5,
    text: 'I have lost 8 pounds and gained a lot of muscles since fixing my sleep with Bliss alarm. My metabolism is working better, and I have the energy to exercise regularly now.',
    category: 'Physical - Body',
  },
  // Mental 1
  {
    id: '3',
    name: 'Emma L.',
    rating: 5,
    text: 'My skin has completely transformed since using Bliss alarm. The dark circles under my eyes are gone, and friends keep asking what skincare products I am using! I just improved my sleep!',
    category: 'Mental',
  },
  // Mental 2
  {
    id: '4',
    name: 'David R.',
    rating: 5,
    text: 'I feel calmer throughout the day and can handle stress so much better.',
    category: 'Mental',
  },
  // Social 1
  {
    id: '5',
    name: 'Jessica M.',
    rating: 5,
    text: 'I am more present in conversations and actually enjoy social events now. Before Bliss alarm, I was always too tired to connect with friends. Now I am in a happy relationship. :)',
    category: 'Social',
  },
  // Social 2
  {
    id: '6',
    name: 'Alex P.',
    rating: 5,
    text: 'I have not been late to work once since using Bliss alarm! The alarm system actually works, and I wake up refreshed instead of hitting snooze repeatedly.',
    category: 'Social',
  },
  // Work punctuality
  {
    id: '7',
    name: 'Thomas K.',
    rating: 5,
    text: 'This decision changed my life for the better in ways I never imagined. A year later, I can confidently say that I am so glad I started this. I used to scroll for our hours in bed and had really bad sleep schedule. The journey wasn not easy but it was worth every step.',
    category: 'Work',
  },
];

export default function ReviewsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>
            Better Sleep Regime Benefits
          </Text>
          
          {/* Reviews list */}
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{review.name}</Text>
                <View style={styles.ratingContainer}>
                  {[...Array(review.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={16} color="#FFD700" />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </ScrollView>
        
        {/* Sticky button */}
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/quiz/analysis')}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
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
    paddingBottom: 80, // Add padding to prevent content from being hidden behind sticky button
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff', // Changed to white as requested
    marginBottom: 25,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
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
    color: '#000', // Black text on blue button
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 