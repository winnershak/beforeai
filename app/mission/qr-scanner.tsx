import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const device = useCameraDevice('back');

  useEffect(() => {
    const getPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
    };
    getPermission();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8'],
    onCodeScanned: (codes) => {
      if (codes.length > 0) {
        router.push({
          pathname: '/mission/qrcode',
          params: {
            ...params,
            scannedCode: codes[0].value
          }
        });
      }
    }
  });

  if (!device || !hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Code</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
}); 
 