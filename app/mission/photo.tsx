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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Load saved photos when component mounts
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        // First load all photos
        const savedPhotos = await AsyncStorage.getItem('savedPhotos');
        let photosList: string[] = [];
        
        if (savedPhotos) {
          photosList = JSON.parse(savedPhotos) as string[];
          setPhotos(photosList);
        }

        // Then load selected photo
        const selectedPhoto = await AsyncStorage.getItem('selectedAlarmPhoto');
        if (selectedPhoto) {
          console.log('Loading selected photo:', selectedPhoto);
          setSelectedPhoto(selectedPhoto);
          
          // Find index in loaded photos array
          const index = photosList.findIndex(p => p === selectedPhoto);
          console.log('Found index:', index);
          if (index !== -1) {
            setSelectedIndex(index);
          }
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };

    loadSavedState();
  }, []); // Only run on mount

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

  // Handle photo selection
  const handlePhotoSelect = async (photo: string, index: number) => {
    try {
      console.log('Selecting photo:', photo, 'at index:', index);
      setSelectedPhoto(photo);
      setSelectedIndex(index);
      
      // Save selection to AsyncStorage
      await AsyncStorage.setItem('selectedAlarmPhoto', photo);
      console.log('Saved selection to AsyncStorage');
    } catch (error) {
      console.error('Error saving photo selection:', error);
    }
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

  const handleDone = async () => {
    console.log('Done button pressed');
    try {
      if (selectedPhoto) {
        // Save selected photo
        await AsyncStorage.setItem('selectedAlarmPhoto', selectedPhoto);
        // Save mission type
        await AsyncStorage.setItem('selectedMissionType', 'Photo');
        
        console.log('Mission data saved:', {
          type: 'Photo',
          photo: selectedPhoto
        });
      }
      
      router.push('/new-alarm');
    } catch (error) {
      console.error('Error saving mission data:', error);
    }
  };

  // Add useEffect to load saved photo on mount
  useEffect(() => {
    const loadSavedPhoto = async () => {
      try {
        const savedPhoto = await AsyncStorage.getItem('selectedAlarmPhoto');
        if (savedPhoto) {
          console.log('Loading saved photo:', savedPhoto);
          setSelectedPhoto(savedPhoto);
          const index = photos.findIndex(p => p === savedPhoto);
          if (index !== -1) {
            setSelectedIndex(index);
          }
        }
      } catch (error) {
        console.error('Error loading saved photo:', error);
      }
    };

    loadSavedPhoto();
  }, [photos]);

  // Render photo grid item
  const renderPhotoItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        selectedIndex === index && styles.selectedPhoto
      ]}
      onPress={() => handlePhotoSelect(item, index)}
    >
      <Image source={{ uri: item }} style={styles.photo} />
      {selectedIndex === index && (
        <View style={styles.selectedOverlay}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
            onPress={() => handlePhotoSelect(photo, index)}
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
              <View style={styles.checkmarkContainer}>
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
  checkmarkContainer: {
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
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedOverlay: {
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
}); 