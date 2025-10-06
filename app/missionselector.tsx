import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PremiumModal from './components/PremiumModal';
import RevenueCatService from './services/RevenueCatService';

// Define mission types with emojis
const missions = [
  {
    id: 'math',
    name: 'Math',
    emoji: '🔢',
    description: 'Solve math problems to turn off the alarm',
    needsConfig: true,
    isPremium: true   // PREMIUM
  },
  {
    id: 'typing',
    name: 'Typing',
    emoji: '⌨️',
    description: 'Type the phrase correctly to turn off the alarm',
    needsConfig: true,
    isPremium: true   // PREMIUM
  },
  {
    id: 'wordle',
    name: 'Wordle',
    emoji: '🎲',
    description: 'Guess the word to turn off the alarm (Once per day)',
    needsConfig: false,
    isPremium: true   // PREMIUM
  },
  {
    id: 'qr',
    name: 'QR/Barcode',
    emoji: '📱',
    description: 'Scan a specific code to turn off the alarm',
    needsConfig: true,
    isPremium: true   // PREMIUM
  },
  {
    id: 'tetris',
    name: 'Tetris',
    emoji: '🧩',
    description: 'Clear lines in Tetris to turn off the alarm',
    needsConfig: true,
    isPremium: true   // PREMIUM
  }
];

export default function MissionSelector() {
  const params = useLocalSearchParams();
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');
  
  // Check if a mission was previously selected
  useEffect(() => {
    const checkPreviousMission = async () => {
      try {
        if (params.selectedMissionId) {
          setSelectedMission(params.selectedMissionId as string);
        } else {
          const savedMission = await AsyncStorage.getItem('selectedMissionId');
          if (savedMission) {
            setSelectedMission(savedMission);
          }
        }
      } catch (error) {
        console.error('Error checking previous mission:', error);
      }
    };
    
    checkPreviousMission();
  }, [params.selectedMissionId]);

  useEffect(() => {
    const checkPremium = async () => {
      const premium = await RevenueCatService.checkLocalSubscriptionStatus();
      setIsPremium(premium);
    };
    checkPremium();
  }, []);
  
  const handleMissionSelect = async (mission: any) => {
    // Check if mission requires premium
    if (mission.isPremium && !isPremium) {
      setPremiumMessage(`${mission.name} is a premium feature. Upgrade to unlock.`);
      setShowPremiumModal(true);
      return;
    }

    try {
      console.log(`Selected mission: ${mission.id}`);
      setSelectedMission(mission.id);
      
      // Save selected mission ID
      await AsyncStorage.setItem('selectedMissionId', mission.id);
      await AsyncStorage.setItem('selectedMissionType', mission.name);
      await AsyncStorage.setItem('selectedMissionEmoji', mission.emoji);
      
      // Route to the appropriate configuration page based on mission type
      switch (mission.id) {
        
        case 'math':
          // Navigate to math configuration
          router.push('/mission/math');
          break;
        
        case 'typing':
          // Navigate to typing configuration
          router.push('/mission/typing');
          break;
        
        case 'qr':
          // Navigate to QR code configuration
          router.push('/mission/qrcode');
          break;
        
        case 'tetris':
          // For Tetris, save default settings and go back to new-alarm
          await AsyncStorage.setItem('tetrisLines', '3'); // Default to 3 lines
          await AsyncStorage.setItem('tetrisTimeLimit', '120'); // Default to 120 seconds
          console.log('Saved default Tetris settings');
          router.push('/new-alarm');
          break;
        
        default:
          // For other missions (Wordle), go directly back to new-alarm
          router.push('/new-alarm');
          break;
      }
    } catch (error) {
      console.error('Error selecting mission:', error);
    }
  };
  
  const renderMissionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.missionItem,
        selectedMission === item.id && styles.selectedMission,
        item.isPremium && !isPremium && styles.premiumMission
      ]}
      onPress={() => handleMissionSelect(item)}
    >
      <View style={styles.missionContent}>
        <Text style={styles.missionEmoji}>{item.emoji}</Text>
        <View style={styles.missionTextContainer}>
          <Text style={styles.missionName}>{item.name}</Text>
          <Text style={styles.missionDescription}>{item.description}</Text>
        </View>
        {item.isPremium && !isPremium && (
          <Ionicons name="lock-closed" size={20} color="#FFD700" style={styles.premiumLock} />
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Choose Mission' }} />
      
      <FlatList
        data={missions}
        renderItem={renderMissionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={premiumMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 16,
  },
  missionItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMission: {
    borderColor: '#4169E1',
  },
  missionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  missionTextContainer: {
    flex: 1,
  },
  missionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  missionDescription: {
    fontSize: 14,
    color: '#999',
  },
  premiumMission: {
    opacity: 0.6,
  },
  premiumLock: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
}); 