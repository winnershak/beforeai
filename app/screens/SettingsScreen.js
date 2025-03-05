import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Picker } from 'react-native';
import { testNotification } from '../services/NotificationService';

function SettingsScreen() {
  const [bedtimeEnabled, setBedtimeEnabled] = useState(false);
  const [bedtime, setBedtime] = useState('22:00');
  const [selectedSound, setSelectedSound] = useState('reflection');

  const showBedtimePicker = () => {
    // Implement the logic to show the time picker
  };

  return (
    <View style={styles.container}>
      {/* Keep other settings */}
      
      {/* Bedtime notification settings */}
      <Text style={styles.sectionTitle}>Bedtime Reminder</Text>
      <View style={styles.setting}>
        <Text>Enable Bedtime Reminder</Text>
        <Switch 
          value={bedtimeEnabled} 
          onValueChange={setBedtimeEnabled} 
        />
      </View>
      
      {/* Bedtime picker */}
      <View style={styles.setting}>
        <Text>Bedtime</Text>
        <TouchableOpacity onPress={showBedtimePicker}>
          <Text>{bedtime}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Sound selection */}
      <View style={styles.setting}>
        <Text>Sleep Sound</Text>
        <Picker
          selectedValue={selectedSound}
          onValueChange={setSelectedSound}
        >
          <Picker.Item label="Reflection" value="reflection" />
          <Picker.Item label="Beacon" value="beacon" />
          <Picker.Item label="Chimes" value="chimes" />
          <Picker.Item label="Circuit" value="circuit" />
          <Picker.Item label="Happy" value="happy" />
          <Picker.Item label="Orkney" value="orkney" />
          <Picker.Item label="Radar" value="radar" />
        </Picker>
      </View>
      
      {/* Remove sleep time settings */}
      
      {/* Keep other settings */}
      
      {/* Test notification button */}
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => testNotification(selectedSound)}
      >
        <Text style={styles.testButtonText}>Test Bedtime Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
};

export default SettingsScreen; 