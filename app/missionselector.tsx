import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const missions = [
  { id: 'math', name: 'Math', icon: '🔢' },
  { id: 'typing', name: 'Typing', icon: '⌨️' },
  { id: 'qrcode', name: 'QR/Barcode', icon: '📱' },
  { id: 'photo', name: 'Photo', icon: '📸' },
];

export default function MissionSelectScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Mission</Text>
      {missions.map((mission) => (
        <TouchableOpacity
          key={mission.id}
          style={styles.missionButton}
          onPress={() => {
            if (mission.id === 'math') {
              router.push('/mission/math');
            } else {
              router.back();
              router.setParams({ mission: mission.name });
            }
          }}
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