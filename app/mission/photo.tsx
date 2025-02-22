// just manage the photos and the preview

import { View, Text, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhotoMission() {
  const params = useLocalSearchParams();
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Load saved photos when component mounts
  useEffect(() => {
    loadPhotos();
  }, []);

  // Add useEffect to handle returned photo
  useEffect(() => {
    if (params.capturedPhoto) {
      saveNewPhoto(params.capturedPhoto as string);
    }
  }, [params.capturedPhoto]);

  const handleAddPhoto = () => {
    console.log('Navigating to photo scanner');
    router.push({
      pathname: '/mission/photoscanner',  // Changed from photo-preview to photoscanner
      params: {
        mode: 'add'
      }
    });
  };

  const loadPhotos = async () => {
    try {
      const savedPhotos = await AsyncStorage.getItem('savedPhotos');
      if (savedPhotos) {
        const parsedPhotos = JSON.parse(savedPhotos);
        // Remove duplicates and invalid paths
        const uniquePhotos = [...new Set(parsedPhotos)].filter(Boolean) as string[];
        setPhotos(uniquePhotos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]); // Fallback to empty array on error
    }
  };

  const saveNewPhoto = async (newPhotoPath: string) => {
    try {
      if (!newPhotoPath) return; // Don't save empty paths

      // Get latest photos from storage
      const savedPhotos = await AsyncStorage.getItem('savedPhotos');
      let existingPhotos: string[] = [];
      
      if (savedPhotos) {
        existingPhotos = JSON.parse(savedPhotos);
      }

      // Add new photo if it doesn't exist
      if (!existingPhotos.includes(newPhotoPath)) {
        const updatedPhotos = [...existingPhotos, newPhotoPath];
        await AsyncStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos));
        setPhotos(updatedPhotos);
        console.log('Photo saved successfully:', newPhotoPath);
      }
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  };

  const deletePhoto = async (photoPath: string) => {
    try {
      const updatedPhotos = photos.filter(p => p !== photoPath);
      await AsyncStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos));
      setPhotos(updatedPhotos);
      console.log('Photo deleted successfully:', photoPath);
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handlePhotoPress = (photo: string) => {
    setSelectedPhoto(selectedPhoto === photo ? null : photo);
  };

  const handlePreview = () => {
    if (selectedPhoto) {
      router.push({
        pathname: '/mission/photopreview',  // Note: no hyphen here
        params: {
          targetPhoto: selectedPhoto,
          sound: params?.sound
        }
      });
    }
  };

  const handleDone = () => {
    if (!selectedPhoto) return;
    
    router.push({
      pathname: '/new-alarm',
      params: {
        ...params,
        selectedMissionId: 'photo',
        selectedMissionName: 'Photo',
        selectedMissionIcon: '📸',
        photos: JSON.stringify([selectedPhoto])
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.photosGrid}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
        {photos.map((photo, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.photoContainer,
              selectedPhoto === photo && styles.selectedPhoto
            ]}
            onPress={() => handlePhotoPress(photo)}
          >
            <Image source={{ uri: `file://${photo}` }} style={styles.photo} />
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                deletePhoto(photo);
              }}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
            {selectedPhoto === photo && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.previewButton,
            !selectedPhoto && styles.buttonDisabled
          ]} 
          onPress={handlePreview}
          disabled={!selectedPhoto}
        >
          <Text style={[
            styles.buttonText,
            !selectedPhoto && styles.buttonTextDisabled
          ]}>
            Preview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.doneButton,
            !selectedPhoto && styles.buttonDisabled
          ]} 
          onPress={handleDone}
          disabled={!selectedPhoto}
        >
          <Text style={[
            styles.buttonText,
            !selectedPhoto && styles.buttonTextDisabled
          ]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setPreviewVisible(false)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <Image 
              source={{ uri: `file://${selectedPhoto}` }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3c3c3e',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectedPhoto: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checkmark: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#666',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#2c2c2e',
  },
  doneButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
}); 