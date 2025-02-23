import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { useRouter } from 'expo-router';

const QR = () => {
  const [selectedQR, setSelectedQR] = useState('');
  const router = useRouter();

  const handleQRSelect = (data: string) => {
    setSelectedQR(data);
  };

  const handleDone = () => {
    console.log('Done button pressed');
    try {
      console.log('Attempting navigation...');
      router.push('/new-alarm');
      console.log('Navigation completed');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={(e) => handleQRSelect(e.data)}
        reactivate={true}
        reactivateTimeout={2000}
        showMarker={true}
        containerStyle={styles.cameraContainer}
        cameraStyle={styles.camera}
      />
      {selectedQR && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedText}>Selected QR: {selectedQR}</Text>
          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={handleDone}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  selectedContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
  },
  selectedText: {
    color: '#fff',
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center' as const,
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default QR;