import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Sample user reviews with profile images
const userReviews = [
  {
    id: '1',
    name: 'Emily Johnson',
    rating: 5,
    text: 'Rise has completely changed my sleep habits. I feel more energetic and focused throughout the day.',
    image: require('../../assets/images/profile1.webp'), // Replace with actual profile images
  },
  {
    id: '2',
    name: 'James Wilson',
    rating: 5,
    text: 'The sleep tracking is incredibly accurate. I love seeing my progress over time.',
    image: require('../../assets/images/profile2.webp'),
  },
  {
    id: '3',
    name: 'Sophia Martinez',
    rating: 4,
    text: 'Great app! The only reason I am not giving 5 stars is because I wish there were more sound options.',
    image: require('../../assets/images/profile3.webp'),
  },
];

export default function RatingScreen() {
  // Function to handle the next button press
  const handleNext = () => {
    // Here you would normally submit the 5-star rating
    // For now, just navigate to the next page
    router.push('/quiz/yes');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>Give us a rating</Text>
          
          {/* Display fixed 5-star rating (not clickable) */}
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={40}
                color="#FFD700"
                style={styles.starIcon}
              />
            ))}
          </View>
          
          <Text style={styles.subheader}>What others are saying</Text>
          
          {/* User reviews with profile images */}
          {userReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  <Image source={review.image} style={styles.profileImage} />
                  <Text style={styles.reviewName}>{review.name}</Text>
                </View>
                <View style={styles.reviewRating}>
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
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>Next</Text>
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
    color: '#fff',
    marginBottom: 25,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  starIcon: {
    marginHorizontal: 8,
  },
  subheader: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  reviewRating: {
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
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  buttonText: {
    color: '#000',
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