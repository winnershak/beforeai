import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const cardWidth = width - 32; // Full width with padding

interface TutorialTopic {
  id: string;
  icon: string;
  title: string;
  hook: string;
  color: string;
}

export default function TutorialScreen() {
  // Section 1: Sleep Basics & How-To
  const sleepBasicsSection = [
    {
      id: '1',
      icon: 'phone-portrait-outline',
      title: 'How to Use This App',
      hook: 'Sleep sounds, alarms, blockers',
      color: '#FF3B30'
    },
    {
      id: '2',
      icon: 'warning-outline',
      title: 'Why Bad Sleep Destroys You',
      hook: 'Brain fog, weight gain, disease',
      color: '#FF9500'
    },
    {
      id: '3',
      icon: 'bed-outline',
      title: 'How to Fall Asleep Fast',
      hook: 'No more tossing & turning',
      color: '#FFCC00'
    },
    {
      id: '4',
      icon: 'phone-off-outline',
      title: 'Your Phone Is Killing Your Sleep',
      hook: 'Screens trick your brain',
      color: '#4CD964'
    },
    {
      id: '5',
      icon: 'sunny-outline',
      title: 'Wake Up Right',
      hook: 'Light, alarm, same time',
      color: '#5AC8FA'
    },
    {
      id: '6',
      icon: 'moon-outline',
      title: 'Build a Night Routine',
      hook: 'Train your brain for sleep',
      color: '#007AFF'
    },
    {
      id: '7',
      icon: 'home-outline',
      title: 'Set Up Your Sleep Cave',
      hook: 'Cool, dark, quiet, comfy',
      color: '#5856D6'
    },
  ];

  // Section 2: Knowledge is Power
  const knowledgeSection = [
    {
      id: '8',
      icon: 'medical-outline',
      title: 'Should You Take Sleep Pills?',
      hook: 'When they help or hurt',
      color: '#FF2D55'
    },
    {
      id: '9',
      icon: 'fast-food-outline',
      title: 'Food & Caffeine Rules',
      hook: 'What (not) to eat before bed',
      color: '#AF52DE'
    },
    {
      id: '10',
      icon: 'help-circle-outline',
      title: 'Sleep Myths That Mess You Up',
      hook: 'Truth > TikTok advice',
      color: '#FF3B30'
    },
    {
      id: '11',
      icon: 'time-outline',
      title: 'Naps: Good or Bad?',
      hook: 'Refresh or ruin your night?',
      color: '#FF9500'
    },
    {
      id: '12',
      icon: 'fitness-outline',
      title: 'Move to Sleep Better',
      hook: 'Exercise helps you knock out',
      color: '#4CD964'
    },
    {
      id: '13',
      icon: 'cloud-outline',
      title: 'What\'s Up With Dreams?',
      hook: 'Your brain\'s nightly movie',
      color: '#5AC8FA'
    },
  ];

  // Section 3: Remember This When You Want to Skip Sleep
  const rememberSection = [
    {
      id: '14',
      icon: 'brain-outline',
      title: 'Sleep & Mental Health',
      hook: 'Anxiety, mood, burnout',
      color: '#007AFF'
    },
    {
      id: '15',
      icon: 'fitness-outline',
      title: 'Sleep & Muscle Growth',
      hook: 'Recovery, hormones, gains',
      color: '#34C759'
    },
    {
      id: '16',
      icon: 'shield-outline',
      title: 'Sleep & Immunity',
      hook: 'Fight illness, stay healthy',
      color: '#5856D6'
    },
    {
      id: '17',
      icon: 'sparkles-outline',
      title: 'Sleep & Beauty',
      hook: 'Skin, aging, glow',
      color: '#FF9500'
    },
    {
      id: '18',
      icon: 'hourglass-outline',
      title: 'Sleep & Longevity',
      hook: 'Live longer, age better',
      color: '#FF2D55'
    },
    {
      id: '19',
      icon: 'scale-outline',
      title: 'Sleep & Weight Loss',
      hook: 'Hormones, cravings, metabolism',
      color: '#4CD964'
    },
    {
      id: '20',
      icon: 'school-outline',
      title: 'Sleep for Kids & Students',
      hook: 'Growth, behavior, learning',
      color: '#AF52DE'
    },
  ];

  const navigateToTopic = (topicId: string) => {
    router.push(`/tutorial/${topicId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Sleep School
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcomeText}>
          Master Your Sleep
        </Text>
        
        <Text style={styles.subText}>
          Tap any topic to learn sleep secrets
        </Text>

        {/* Section 1 */}
        <Text style={styles.sectionHeader}>Sleep Basics & How-To</Text>
        <View style={styles.topicsList}>
          {sleepBasicsSection.map((topic) => (
            <TouchableOpacity 
              key={topic.id} 
              style={styles.topicButton}
              onPress={() => navigateToTopic(topic.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: topic.color }]}>
                <Ionicons name={topic.icon as any} size={24} color="#FFFFFF" />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.topicTitle}>
                  {topic.title}
                </Text>
                
                <Text style={styles.topicHook}>
                  {topic.hook}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 2 */}
        <Text style={styles.sectionHeader}>Knowledge is Power</Text>
        <View style={styles.topicsList}>
          {knowledgeSection.map((topic) => (
            <TouchableOpacity 
              key={topic.id} 
              style={styles.topicButton}
              onPress={() => navigateToTopic(topic.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: topic.color }]}>
                <Ionicons name={topic.icon as any} size={24} color="#FFFFFF" />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.topicTitle}>
                  {topic.title}
                </Text>
                
                <Text style={styles.topicHook}>
                  {topic.hook}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 3 */}
        <Text style={styles.sectionHeader}>Remember This When You Want to Skip Sleep</Text>
        <View style={styles.topicsList}>
          {rememberSection.map((topic) => (
            <TouchableOpacity 
              key={topic.id} 
              style={styles.topicButton}
              onPress={() => navigateToTopic(topic.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: topic.color }]}>
                <Ionicons name={topic.icon as any} size={24} color="#FFFFFF" />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.topicTitle}>
                  {topic.title}
                </Text>
                
                <Text style={styles.topicHook}>
                  {topic.hook}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  
  scrollView: {
    flex: 1,
  },
  
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  
  subText: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 30,
    textAlign: 'center',
  },
  
  topicsList: {
    width: '100%',
  },
  
  topicButton: {
    width: '100%',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  textContainer: {
    flex: 1,
  },
  
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  topicHook: {
    fontSize: 14,
    color: '#BBBBBB',
  },
  
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 30,
    marginBottom: 15,
    paddingLeft: 5,
  },
}); 