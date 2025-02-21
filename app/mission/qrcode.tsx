import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function QRCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleAdd = () => {
    router.push({
      pathname: '/mission/qr-scanner',
      params: {
        ...params
      }
    });
  };

  const handlePreview = () => {
    // For now, just return to alarm page
    router.back();
  };

  const handleDone = () => {
    router.push({
      pathname: '/new-alarm',
      params: {
        ...params,
        selectedMissionId: 'qrcode',
        selectedMissionName: 'QR/Barcode',
        selectedMissionIcon: '📱'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>QR/Barcode</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>

      <View style={styles.qrContainer}>
        <View style={styles.qrItem}>
          <View style={styles.qrIcon} />
          <Text style={styles.qrText}>QR</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
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
  addButton: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  qrContainer: {
    marginHorizontal: 20,
  },
  qrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 12,
  },
  qrIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginRight: 12,
  },
  qrText: {
    color: '#fff',
    fontSize: 17,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    marginTop: 'auto',
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
}); 