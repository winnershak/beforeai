import { Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

export const shareToInstagramStory = async (viewRef: any, backgroundImageUri?: string) => {
  try {
    // 1. Check if Instagram is installed
    const canOpen = await Linking.canOpenURL('instagram-stories://share');
    if (!canOpen) {
      Alert.alert('Instagram Required', 'Please install Instagram to share to stories');
      return;
    }

    // 2. Capture screenshot of your achievement
    const uri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.9,
    });

    // 3. Convert to base64 for Instagram
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 4. Create Instagram URL with sticker data
    const instagramURL = `instagram-stories://share?source_application=your_app_id&background_top_color=%23FF6B6B&background_bottom_color=%234ECDC4&content_url=data:image/jpeg;base64,${base64}`;

    // 5. Open Instagram
    await Linking.openURL(instagramURL);
    
  } catch (error) {
    console.error('Instagram share failed:', error);
    Alert.alert('Share Failed', 'Could not share to Instagram');
  }
}; 