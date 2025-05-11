import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from './services/RevenueCatService';

const { width, height } = Dimensions.get('window');

export default function RedemptionScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const backgroundImage = require('../assets/images/10.png');

  const handleActivate = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a redemption code');
      return;
    }

    setLoading(true);
    
    try {
      // Special case for App Store reviewer code
      if (code.toUpperCase() === "BLISS-APP-REVIEW32") {
        // Grant lifetime premium access for App Store reviewers
        const now = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(now.getFullYear() + 99); // 99 years (effectively lifetime)
        
        // Store redemption details in AsyncStorage
        await AsyncStorage.setItem('isPremium', 'true');
        await AsyncStorage.setItem('redemptionCode', 'BLISS-APP-REVIEW32');
        await AsyncStorage.setItem('subscriptionExpiryDate', expiryDate.toISOString());
        await AsyncStorage.setItem('subscriptionType', 'lifetime');
        await AsyncStorage.setItem('quizCompleted', 'true');
        
        // Show success message
        Alert.alert(
          'Success!', 
          'Your premium subscription has been activated!',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
        
        setLoading(false);
        return;
      }
      
      // Regular validation for normal codes continues here
      const codePattern = /^BLISS-([A-Z0-9]+)-([A-Z0-9]+)$/i;
      if (!codePattern.test(code.toUpperCase())) {
        Alert.alert('Invalid Code', 'Please enter a valid redemption code');
        setLoading(false);
        return;
      }
      
      // Extract plan type from code
      const codeParts = code.toUpperCase().split('-');
      const rawPlanType = codeParts[1]; 
      
      // Store the original plan type for reference
      const originalPlan = rawPlanType;
      
      // For now, all users get 6 months premium regardless of plan
      // Calculate expiry date - 6 months from now
      const now = new Date();
      let expiryDate = new Date();
      expiryDate.setMonth(now.getMonth() + 6);
      
      // Store redemption details in AsyncStorage
      await AsyncStorage.setItem('isPremium', 'true');
      await AsyncStorage.setItem('redemptionCode', code);
      await AsyncStorage.setItem('subscriptionExpiryDate', expiryDate.toISOString());
      await AsyncStorage.setItem('subscriptionType', originalPlan.toLowerCase());
      await AsyncStorage.setItem('quizCompleted', 'true');
      
      // Show success message
      Alert.alert(
        'Success!', 
        'Your premium subscription has been activated!',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );
      
    } catch (error) {
      console.error('Error activating code:', error);
      Alert.alert('Error', 'There was a problem activating your code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Redemption Code',
        headerShown: true,
        headerTransparent: true,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF' }
      }} />
      
      <ImageBackground 
        source={backgroundImage}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentContainer}>
                  <Text style={styles.title}>Enter Your Redemption Code</Text>
                  
                  <Text style={styles.instructions}>
                    Enter the code you received with your purchase to activate premium features.
                  </Text>
                  
                  <View style={styles.codeInputContainer}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="BLISS-XXXX-XXXXXXXXX"
                      placeholderTextColor="#999"
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.activateButton}
                    onPress={handleActivate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.activateButtonText}>Activate Premium</Text>
                    )}
                  </TouchableOpacity>
                  
                  <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#CCCCCC" />
                    <Text style={styles.infoText}>
                      Redemption codes are case-insensitive and should be in the format BLISS-PLAN-CODE
                    </Text>
                  </View>
                  
                  <View style={styles.helpContainer}>
                    <Text style={styles.helpText}>
                      Having trouble with your code? Contact us at support@blissalarm.com
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 25,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    letterSpacing: 2,
  },
  activateButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  activateButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  helpContainer: {
    marginTop: 30,
  },
  helpText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
}); 