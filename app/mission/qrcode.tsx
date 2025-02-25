import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NameCodeModal from './components/NameCodeModal';

interface ScannedCode {
  id: string;
  name: string;
  value: string;
}

export default function QRCode() {
  const [codes, setCodes] = useState<ScannedCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    loadCodes();
    if (params.scannedCode) {
      setPendingCode(params.scannedCode as string);
      setShowModal(true);
    }
  }, [params.scannedCode]);

  // Auto-select if there's only one code
  useEffect(() => {
    if (codes.length === 1) {
      setSelectedCode(codes[0].value);
    }
  }, [codes]);

  const loadCodes = async () => {
    try {
      const savedCodes = await AsyncStorage.getItem('scannedCodes');
      if (savedCodes) {
        setCodes(JSON.parse(savedCodes));
      }
    } catch (error) {
      console.error('Error loading codes:', error);
    }
  };

  const saveNewCode = async (name: string, value: string) => {
    try {
      // If editing existing code, update it instead of creating new
      const existingCodeIndex = codes.findIndex(code => code.value === value);
      let updatedCodes;
      
      if (existingCodeIndex !== -1) {
        // Update existing code
        updatedCodes = [...codes];
        updatedCodes[existingCodeIndex].name = name;
      } else {
        // Create new code
        const codeItem: ScannedCode = {
          id: Date.now().toString(),
          name,
          value
        };
        updatedCodes = [codeItem, ...codes];
      }
      
      await AsyncStorage.setItem('scannedCodes', JSON.stringify(updatedCodes));
      setCodes(updatedCodes);
      setPendingCode(null);
      setShowModal(false);
    } catch (error) {
      console.error('Error saving code:', error);
    }
  };

  const deleteCode = async (id: string) => {
    Alert.alert(
      'Delete Code',
      'Are you sure you want to delete this code?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCodes = codes.filter(code => code.id !== id);
            await AsyncStorage.setItem('scannedCodes', JSON.stringify(updatedCodes));
            setCodes(updatedCodes);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: ScannedCode }) => (
    <TouchableOpacity 
      style={[
        styles.codeItem,
        selectedCode === item.value && styles.selectedCodeItem
      ]}
      onPress={() => setSelectedCode(item.value)}
    >
      <View style={styles.codeContent}>
        <View style={[
          styles.selectionCircle,
          selectedCode === item.value && styles.selectedCircle
        ]} />
        <Text style={styles.codeName}>{item.name}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          onPress={() => {
            setPendingCode(item.value);
            setShowModal(true);
          }}
          style={styles.iconButton}
        >
          <Ionicons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => deleteCode(item.id)}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const handleDone = async () => {
    console.log('Done button pressed');
    try {
      if (selectedCode) {
        // Save QR code
        console.log('Saving QR code:', selectedCode);
        await AsyncStorage.setItem('selectedAlarmQR', selectedCode);
        
        // Save mission type
        console.log('Saving mission type: QR/Barcode');
        await AsyncStorage.setItem('selectedMissionType', 'QR/Barcode');
        
        // Save mission settings - THIS IS THE IMPORTANT PART
        const missionSettings = {
          targetCode: selectedCode
        };
        console.log('Saving mission settings:', missionSettings);
        await AsyncStorage.setItem('selectedMissionSettings', JSON.stringify(missionSettings));
      }
      
      console.log('Attempting navigation...');
      router.push('/new-alarm');
      console.log('Navigation completed');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add useEffect to load saved QR code on mount
  useEffect(() => {
    const loadSavedQR = async () => {
      try {
        const savedQR = await AsyncStorage.getItem('selectedAlarmQR');
        if (savedQR) {
          console.log('Loading saved QR:', savedQR);
          setSelectedCode(savedQR);
        }
      } catch (error) {
        console.error('Error loading saved QR:', error);
      }
    };

    loadSavedQR();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR/Barcode</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/mission/qr-scanner')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={codes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No codes scanned yet</Text>
        }
      />

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[
            styles.previewButton,
            !selectedCode && styles.previewButtonDisabled
          ]} 
          onPress={() => {
            if (selectedCode) {
              router.push({
                pathname: '/mission/qrpreview',
                params: {
                  sound: params.sound || 'orkney',
                  targetCode: selectedCode
                }
              });
            }
          }}
          disabled={!selectedCode}
        >
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <NameCodeModal
        isVisible={showModal}
        scannedValue={pendingCode || ''}
        onSave={saveNewCode}
        onCancel={() => {
          setShowModal(false);
          setPendingCode(null);
        }}
      />
    </View>
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
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  codeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 10,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
  },
  selectedCircle: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  selectedCodeItem: {
    backgroundColor: '#1c1c1e',
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  addButton: {
    padding: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  }
}); 
