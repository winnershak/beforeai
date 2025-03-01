import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const handlePurchase = async () => {
    try {
      // In a real app, you would integrate with in-app purchases here
      // For this example, we'll just simulate a successful purchase
      
      // Mark user as premium
      await AsyncStorage.setItem('isPremium', 'true');
      
      // Mark quiz as completed
      await AsyncStorage.setItem('quizCompleted', 'true');
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error processing purchase:', error);
    }
  };

  const skipSubscription = async () => {
    // Mark quiz as completed but not premium
    await AsyncStorage.setItem('quizCompleted', 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Unlock Premium Features</Text>
        <Text style={styles.subtitle}>
          Based on your answers, we've customized the perfect sleep plan for you.
        </Text>
        
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Monthly</Text>
              {selectedPlan === 'monthly' && (
                <Ionicons name="checkmark-circle" size={24} color="#0A84FF" />
              )}
            </View>
            <Text style={styles.planPrice}>$4.99/month</Text>
            <Text style={styles.planDescription}>
              • Personalized sleep schedule
              • Advanced sleep analytics
              • Premium sleep sounds
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.selectedPlan,
              styles.bestValuePlan
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Yearly</Text>
              {selectedPlan === 'yearly' && (
                <Ionicons name="checkmark-circle" size={24} color="#0A84FF" />
              )}
            </View>
            <Text style={styles.planPrice}>$39.99/year</Text>
            <Text style={styles.planSavings}>Save 33%</Text>
            <Text style={styles.planDescription}>
              • All monthly features
              • Priority customer support
              • Early access to new features
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.purchaseButton,
            !selectedPlan && styles.disabledButton
          ]} 
          onPress={handlePurchase}
          disabled={!selectedPlan}
        >
          <Text style={styles.purchaseButtonText}>
            {selectedPlan ? `Subscribe ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}` : 'Select a Plan'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={skipSubscription}
        >
          <Text style={styles.skipButtonText}>Continue with Free Version</Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscription automatically renews unless auto-renew is turned off.
        </Text>
      </View>
    </SafeAreaView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPlan: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A84FF11',
  },
  bestValuePlan: {
    position: 'relative',
    paddingTop: 30,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  bestValueText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  planPrice: {
    fontSize: 24,
    color: '#0A84FF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planSavings: {
    fontSize: 14,
    color: '#FF9500',
    marginBottom: 10,
  },
  planDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  purchaseButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#0A84FF55',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
}); 