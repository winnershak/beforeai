import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

const missions = [
  { id: 'math', name: 'Math', icon: '🔢' },
  { id: 'typing', name: 'Typing', icon: '⌨️' },
  { id: 'qrcode', name: 'QR/Barcode', icon: '📱' },
  { id: 'photo', name: 'Photo', icon: '📸' },
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
    } else if (mission.id === 'photo') {
      router.push({
        pathname: '/mission/photo',
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