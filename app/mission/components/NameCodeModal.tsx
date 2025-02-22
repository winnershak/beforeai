import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';

interface Props {
  isVisible: boolean;
  scannedValue: string;
  onSave: (name: string, value: string) => void;
  onCancel: () => void;
}

export default function NameCodeModal({ isVisible, scannedValue, onSave, onCancel }: Props) {
  const [name, setName] = useState('');

  const handleSave = () => {
    onSave(name || 'Unnamed Code', scannedValue);
    setName('');
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Name this code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <Text style={styles.valueText}>Code: {scannedValue}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  title: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 15,
  },
  valueText: {
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#383838',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
}); 