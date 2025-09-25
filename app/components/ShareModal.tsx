import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';
import { router } from 'expo-router';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  wakeUpTime: string;
  onShareToJournal: () => void;
}

export function ShareModal({ visible, onClose, wakeUpTime, onShareToJournal }: ShareModalProps) {
  const storyViewRef = useRef<View>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Generate preview when modal opens
  React.useEffect(() => {
    if (visible && !previewUri) {
      // Add a small delay to ensure the view is rendered
      setTimeout(() => {
        generatePreview();
      }, 100);
    }
  }, [visible]);

  const generatePreview = async () => {
    try {
      if (!storyViewRef.current) return;
      
      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 0.8,
        result: 'tmpfile',
      });
      setPreviewUri(uri);
    } catch (error) {
      console.error('Preview generation error:', error);
    }
  };

  const shareToInstagramStory = async () => {
    try {
      setIsCapturing(true);
      
      if (!storyViewRef.current) {
        Alert.alert('Error', 'Unable to create image');
        return;
      }

      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const shareOptions = {
        stickerImage: uri,
        social: Share.Social.INSTAGRAM_STORIES as any,
        appId: '1104244401532187',
        backgroundBottomColor: '#6B46C1',
        backgroundTopColor: '#6B46C1',
      };
      
      await Share.shareSingle(shareOptions);
      onClose();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Instagram share error:', error);
      Alert.alert('Error', 'Unable to share to Instagram');
    } finally {
      setIsCapturing(false);
    }
  };

  const saveToPhotos = async () => {
    try {
      setIsCapturing(true);
      
      // Request permission first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to save images');
        return;
      }
      
      if (!storyViewRef.current) {
        Alert.alert('Error', 'Unable to create image');
        return;
      }

      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Achievement saved to photos!');
      onClose();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Save photo error:', error);
      // Simple fallback - just show generic error if save fails
      Alert.alert('Error', 'Unable to save photo. Please check permissions in Settings.');
    } finally {
      setIsCapturing(false);
    }
  };

  const shareToOtherApps = async () => {
    try {
      setIsCapturing(true);
      
      if (!storyViewRef.current) {
        Alert.alert('Error', 'Unable to create image');
        return;
      }

      const uri = await captureRef(storyViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      await Share.open({
        url: uri,
        title: 'My Wake-up Achievement',
        message: `I woke up at ${wakeUpTime} today!`,  // Removed emoji
      });
      
      onClose();
      router.replace('/(tabs)');
    } catch (error) {
      // Only log error, don't show alert for user cancellation
      console.log('Share cancelled or failed:', error);
      onClose();
      router.replace('/(tabs)');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Achievement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Preview Image */}
          {previewUri && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity style={styles.option} onPress={shareToInstagramStory} disabled={isCapturing}>
              <View style={styles.optionIcon}>
                <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Instagram Story</Text>
                <Text style={styles.optionSubtext}>Share as sticker to your story</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={saveToPhotos} disabled={isCapturing}>
              <View style={styles.optionIcon}>
                <Ionicons name="image" size={24} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Save to Photos</Text>
                <Text style={styles.optionSubtext}>Save achievement image to gallery</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={shareToOtherApps} disabled={isCapturing}>
              <View style={styles.optionIcon}>
                <Ionicons name="share" size={24} color="#34C759" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Share to Apps</Text>
                <Text style={styles.optionSubtext}>WhatsApp, Messages, etc.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={onShareToJournal} disabled={isCapturing}>
              <View style={styles.optionIcon}>
                <Ionicons name="journal" size={24} color="#FF9500" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Add to Journal</Text>
                <Text style={styles.optionSubtext}>Write about your morning</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={() => { onClose(); router.replace('/(tabs)'); }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Hidden view for capturing */}
        <View ref={storyViewRef} style={styles.hiddenStoryView}>
          <View style={styles.storyContent}>
            <Text style={styles.wakeUpLabel}>Wake-up time</Text>
            <Text style={styles.wakeUpTimeDisplay}>{wakeUpTime}</Text>
            <Text style={styles.brandingTextBottom}>Bliss Alarm</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  previewImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
  },
  optionIcon: {
    width: 40,
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  optionSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
  },
  skipText: {
    color: '#666',
    fontSize: 16,
  },
  hiddenStoryView: {
    position: 'absolute',
    top: -9999,
    left: 0,
    backgroundColor: '#6B46C1', // Beautiful purple
    width: 400,
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  storyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeUpLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  wakeUpTimeDisplay: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
    marginBottom: 40,
  },
  brandingTextBottom: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
