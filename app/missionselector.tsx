import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

const missions = [
  { id: 'math', name: 'Math', icon: '🔢' },
  { id: 'typing', name: 'Typing', icon: '⌨️' },
  { id: 'qrcode', name: 'QR/Barcode', icon: '📱' },
  { id: 'wordle', name: 'Wordle Game', icon: '🎲' },
  { id: 'tetris', name: 'Tetris', icon: '🧩' },
];

// Add Tetris to the mission options
const missionOptions = [
  { 
    id: 'math', 
    name: 'Math', 
    description: 'Solve math problems to turn off the alarm',
    icon: 'calculator-outline'
  },
  { 
    id: 'typing', 
    name: 'Typing', 
    description: 'Type a passage correctly to turn off the alarm',
    icon: 'keypad-outline'
  },
  { 
    id: 'wordle', 
    name: 'Wordle', 
    description: 'Guess the 5-letter word to turn off the alarm',
    icon: 'text-outline'
  },
  { 
    id: 'photo', 
    name: 'Photo', 
    description: 'Take a photo of a specific object to turn off the alarm',
    icon: 'camera-outline'
  },
  { 
    id: 'qr', 
    name: 'QR/Barcode', 
    description: 'Scan a QR code or barcode to turn off the alarm',
    icon: 'qr-code-outline'
  },
  { 
    id: 'tetris', 
    name: 'Tetris', 
    description: 'Reach 1000 points in Tetris to turn off the alarm',
    icon: 'grid-outline'
  }
];

export default function MissionSelectScreen() {
  const params = useLocalSearchParams();

  const handleMissionSelect = (mission: {id: string, name: string, icon: string}) => {
    if (mission.id === 'math') {
      router.push({
        pathname: '/mission/math',
        params: { ...params }
      });
    } else if (mission.id === 'typing') {
      router.push({
        pathname: '/mission/typing',
        params: { ...params }
      });
    } else if (mission.id === 'qrcode') {
      router.push({
        pathname: '/mission/qrcode',
        params: { ...params }
      });
    } else if (mission.id === 'wordle') {
      router.push({
        pathname: '/new-alarm',
        params: {
          ...params,
          selectedMissionId: mission.id,
          selectedMissionName: mission.name,
          selectedMissionIcon: mission.icon,
          selectedMissionType: 'Wordle'
        }
      });
    } else if (mission.id === 'tetris') {
      router.push({
        pathname: '/mission/tetris',
        params: { ...params }
      });
    } else {
      router.push({
        pathname: '/new-alarm',
        params: {
          ...params,
          selectedMissionId: mission.id,
          selectedMissionName: mission.name,
          selectedMissionIcon: mission.icon
        }
      });
    }
  };

  useEffect(() => {
    if (params.selectedMissionId) {
      // How is the mission being set here?
      // Are we properly constructing the mission object?
    }
  }, [params.selectedMissionId]);

  const saveAlarm = async () => {
    // How is the mission being included in newAlarm?
    // Is the mission structure correct when updating?
    // Are we properly preserving the mission when editing?
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Mission</Text>
      {missions.map((mission) => (
        <TouchableOpacity
          key={mission.id}
          style={styles.missionButton}
          onPress={() => handleMissionSelect(mission)}
        >
          <Text style={styles.missionIcon}>{mission.icon}</Text>
          <Text style={styles.missionName}>{mission.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  missionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    marginBottom: 12,
  },
  missionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  missionName: {
    fontSize: 18,
    color: '#fff',
  },
}); 