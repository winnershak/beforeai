import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    text: 'Wow I feel 20 years younger just by changing my sleep habits, I can\'t believe how much better I feel!',
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
  const [feedbackStep, setFeedbackStep] = useState<'initial' | 'happy' | 'unhappy'>('initial');
  
  // Handle happy/satisfied user path
  const handleHappyFeedback = async () => {
    setFeedbackStep('happy');
    
    try {
      // Check if StoreReview is available
      if (await StoreReview.isAvailableAsync()) {
        // Request review (shows official App Store dialog)
        await StoreReview.requestReview();
        
        // Store that we've requested a review
        await AsyncStorage.setItem('hasRequestedReview', 'true');
        
        // Wait a moment for the dialog to appear
        setTimeout(() => {
          router.push('/quiz/yes');
        }, 1000);
      } else {
        router.push('/quiz/yes');
      }
    } catch (error) {
      console.log('Error requesting review:', error);
      router.push('/quiz/yes');
    }
  };
  
  // Handle unhappy user path - send to feedback email
  const handleUnhappyFeedback = () => {
    setFeedbackStep('unhappy');
    
    // Open email with pre-filled subject and body
    const emailSubject = "Bliss Alarm App Feedback";
    const emailBody = "Hello Bliss Alarm team,\n\nI'd like to provide feedback about the app:\n\n";
    const mailtoLink = `mailto:kinddesignlab@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    Linking.canOpenURL(mailtoLink).then(supported => {
      if (supported) {
        Linking.openURL(mailtoLink);
      } else {
        Alert.alert(
          "Email Not Available", 
          "Please send your feedback to kinddesignlab@gmail.com"
        );
      }
      
      // Navigation to yes screen happens after a delay
      setTimeout(() => {
        router.push('/quiz/yes');
      }, 1500);
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {feedbackStep === 'initial' && (
            <>
              <Text style={styles.header}>How are you enjoying Bliss Alarm?</Text>
              <View style={styles.feedbackOptions}>
                <TouchableOpacity 
                  style={styles.feedbackOption} 
                  onPress={handleHappyFeedback}
                >
                  <Ionicons name="happy-outline" size={60} color="#4CD964" />
                  <Text style={styles.feedbackText}>I love it!</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.feedbackOption} 
                  onPress={handleUnhappyFeedback}
                >
                  <Ionicons name="sad-outline" size={60} color="#FF3B30" />
                  <Text style={styles.feedbackText}>Could be better</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          
          {feedbackStep === 'happy' && (
            <View style={styles.messageContainer}>
              <Ionicons name="star" size={60} color="#FFD700" />
              <Text style={styles.thankYouText}>Thank you for your feedback!</Text>
              <Text style={styles.instructionText}>The app store rating dialog should appear shortly...</Text>
            </View>
          )}
          
          {feedbackStep === 'unhappy' && (
            <View style={styles.messageContainer}>
              <Ionicons name="mail" size={60} color="#0A84FF" />
              <Text style={styles.thankYouText}>We value your feedback!</Text>
              <Text style={styles.instructionText}>Opening email client to share your thoughts...</Text>
            </View>
          )}
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  feedbackOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  feedbackOption: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 140,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYouText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    maxWidth: '80%',
  }
}); 