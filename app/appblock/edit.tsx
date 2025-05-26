import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  TextInput,
  ScrollView,
  NativeModules,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { ScreenTimeBridge } = NativeModules;

// Define the app block schedule type
interface AppBlockSchedule {
  id: string;
  name: string;
  startTime: Date; // Keep for data structure compatibility
  endTime: Date;   // Keep for data structure compatibility
  daysOfWeek: boolean[]; // Keep for data structure compatibility
  isActive: boolean;
  blockedApps: string[];
  blockedCategories: string[];
  blockedWebDomains: string[];
  selectedDevice: 'qr' | 'nfc';
}

const BlockedItemsCount = ({ 
  apps, 
  categories, 
  webDomains 
}: { 
  apps: string[] | undefined, 
  categories: string[] | undefined, 
  webDomains: string[] | undefined 
}) => {
  // Add null checks with default empty arrays
  const safeApps = apps || [];
  const safeCategories = categories || [];
  const safeWebDomains = webDomains || [];
  
  // Estimate apps in categories (average 10 apps per category)
  const estimatedAppsInCategories = safeCategories.length > 0 ? safeCategories.length * 10 : 0;
  
  // Count total apps (direct + from categories)
  const totalApps = safeApps.length + estimatedAppsInCategories;
  
  // Count total items
  const totalItems = totalApps + safeWebDomains.length;
  
  if (totalItems === 0) {
    return null;
  }
  
  return (
    <View style={styles.countContainer}>
      <Text style={styles.countText}>
        {totalItems} {totalItems === 1 ? 'item' : 'items'} blocked
      </Text>
      {(safeApps.length > 0 || estimatedAppsInCategories > 0) && (
        <View style={styles.countBadge}>
          <Ionicons name="apps" size={14} color="#fff" />
          <Text style={styles.countBadgeText}>{totalApps}</Text>
        </View>
      )}
      {safeWebDomains.length > 0 && (
        <View style={styles.countBadge}>
          <Ionicons name="globe" size={14} color="#fff" />
          <Text style={styles.countBadgeText}>{safeWebDomains.length}</Text>
        </View>
      )}
      {safeCategories.length > 0 && (
        <View style={styles.countBadge}>
          <Ionicons name="folder" size={14} color="#fff" />
          <Text style={styles.countBadgeText}>{safeCategories.length}</Text>
        </View>
      )}
    </View>
  );
};

export default function EditScheduleScreen() {
  const params = useLocalSearchParams();
  const scheduleId = params.id as string;
  const isNew = scheduleId === 'new';
  
  // Use a FIXED ID so we always have only ONE schedule
  const FIXED_SCHEDULE_ID = 'main-schedule';
  
  const [schedule, setSchedule] = useState<AppBlockSchedule>({
    id: FIXED_SCHEDULE_ID, // Always use the same ID
    name: 'App Blocker',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    daysOfWeek: [true, true, true, true, true, true, true],
    isActive: false,
    blockedApps: [],
    blockedCategories: [],
    blockedWebDomains: [],
    selectedDevice: 'qr'
  });
  
  const [schedules, setSchedules] = useState<AppBlockSchedule[]>([]);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [hasQRCode, setHasQRCode] = useState(false);
  const [hasNFCCard, setHasNFCCard] = useState(false);
  
  // Add function to save device selection immediately
  const saveDeviceSelection = async (device: 'qr' | 'nfc') => {
    try {
      console.log(`📱 Saving device selection: ${device}`);
      
      // Update local state
      setSchedule(prev => ({ ...prev, selectedDevice: device }));
      
      // Save to AsyncStorage immediately
      const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        const mainSchedule = parsed.find((s: any) => s.id === FIXED_SCHEDULE_ID);
        
        if (mainSchedule) {
          // Update the device selection in the saved schedule
          mainSchedule.selectedDevice = device;
          await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(parsed));
          console.log(`✅ Device selection saved: ${device}`);
        } else {
          // If no schedule exists yet, just save the device preference
          await AsyncStorage.setItem('selectedDevice', device);
          console.log(`✅ Device preference saved: ${device}`);
        }
      } else {
        // No schedules exist, save device preference separately
        await AsyncStorage.setItem('selectedDevice', device);
        console.log(`✅ Device preference saved: ${device}`);
      }
    } catch (error) {
      console.error('Error saving device selection:', error);
    }
  };
  
  // Update the useEffect to also load saved device preference
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        console.log('🔍 Loading THE schedule...');
        
        // First try to load saved device preference
        const savedDevice = await AsyncStorage.getItem('selectedDevice') as 'qr' | 'nfc' | null;
        
        const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
        if (savedSchedules) {
          const parsed = JSON.parse(savedSchedules);
          console.log('📋 Found saved schedules:', parsed.length);
          
          // Find OUR main schedule
          const mainSchedule = parsed.find((s: any) => s.id === FIXED_SCHEDULE_ID);
          if (mainSchedule) {
            console.log('✅ Found main schedule:', {
              apps: mainSchedule.blockedApps?.length || 0,
              categories: mainSchedule.blockedCategories?.length || 0,
              websites: mainSchedule.blockedWebDomains?.length || 0,
              device: mainSchedule.selectedDevice || savedDevice || 'qr'
            });
            
            setSchedule({
              ...mainSchedule,
              startTime: new Date(mainSchedule.startTime),
              endTime: new Date(mainSchedule.endTime),
              blockedApps: Array.isArray(mainSchedule.blockedApps) ? mainSchedule.blockedApps : [],
              blockedCategories: Array.isArray(mainSchedule.blockedCategories) ? mainSchedule.blockedCategories : [],
              blockedWebDomains: Array.isArray(mainSchedule.blockedWebDomains) ? mainSchedule.blockedWebDomains : [],
              selectedDevice: mainSchedule.selectedDevice || savedDevice || 'qr' // Use saved device or fallback
            });
          } else {
            console.log('📋 No main schedule found, will create new one');
            // If no schedule but we have a saved device preference, use it
            if (savedDevice) {
              setSchedule(prev => ({ ...prev, selectedDevice: savedDevice }));
            }
          }
          
          setSchedules(parsed);
        } else {
          console.log('📋 No saved schedules found');
          // If no schedules but we have a saved device preference, use it
          if (savedDevice) {
            setSchedule(prev => ({ ...prev, selectedDevice: savedDevice }));
          }
        }
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    };
    
    loadSchedules();
  }, []);
  
  // Check if QR code is saved
  useEffect(() => {
    const checkDevices = async () => {
      try {
        const savedQR = await AsyncStorage.getItem('blockEndQRCode');
        setHasQRCode(!!savedQR);
        
        const savedNFC = await AsyncStorage.getItem('blockEndNFCData');
        setHasNFCCard(!!savedNFC);
      } catch (error) {
        console.error('Error checking devices:', error);
      }
    };
    
    checkDevices();
  }, []);
  
  // Open app selection picker
  const selectApps = async () => {
    if (Platform.OS === 'ios' && ScreenTimeBridge) {
      try {
        console.log('🎯 Opening app selection picker...');
        // Pass the schedule ID to the picker
        const result = await ScreenTimeBridge.showAppSelectionPicker(schedule.id);
        
        if (result && Object.keys(result).length > 0) {
          console.log('✅ Selected apps result:', {
            apps: result.apps?.length || 0,
            categories: result.categories?.length || 0,
            websites: result.webDomains?.length || 0
          });
          
          // Update the schedule with the selected apps
          setSchedule(prev => ({
            ...prev,
            blockedApps: result.apps || [],
            blockedCategories: result.categories || [],
            blockedWebDomains: result.webDomains || []
          }));
        } else {
          console.log('❌ No apps selected or empty result');
        }
      } catch (error) {
        console.error('Error selecting apps:', error);
        Alert.alert('Error', 'Failed to select apps. Please try again.');
      }
    } else {
      Alert.alert('Not Available', 'App blocking is only available on iOS.');
    }
  };
  
  // Save the schedule - ALWAYS update the same schedule
  const saveSchedule = async () => {
    try {
      console.log('💾 Saving THE schedule...');
      
      // Validate that we have some apps/websites selected
      if ((!schedule.blockedApps || schedule.blockedApps.length === 0) &&
          (!schedule.blockedCategories || schedule.blockedCategories.length === 0) &&
          (!schedule.blockedWebDomains || schedule.blockedWebDomains.length === 0)) {
        Alert.alert(
          'No Apps Selected', 
          'Please select at least one app, category, or website to block.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create updated schedule with FIXED ID AND selectedDevice
      const updatedSchedule = {
        ...schedule,
        id: FIXED_SCHEDULE_ID, // Always use the same ID
        isActive: false,
        blockedApps: schedule.blockedApps || [],
        blockedCategories: schedule.blockedCategories || [],
        blockedWebDomains: schedule.blockedWebDomains || [],
        selectedDevice: schedule.selectedDevice // Make sure to save the device type!
      };
      
      console.log('📝 Schedule to save:', {
        id: updatedSchedule.id,
        apps: updatedSchedule.blockedApps.length,
        categories: updatedSchedule.blockedCategories.length,
        websites: updatedSchedule.blockedWebDomains.length,
        device: updatedSchedule.selectedDevice
      });
      
      // CLEAN SLATE: Remove all old schedules and save only ONE
      const cleanSchedules = [updatedSchedule];
      
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(cleanSchedules));
      console.log('💾 Successfully saved ONLY ONE schedule to AsyncStorage');
      
      // Verify the save
      const savedData = await AsyncStorage.getItem('appBlockSchedules');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('✅ Verified: Now have', parsedData.length, 'schedule(s)');
        
        Alert.alert(
          'Settings Saved!', 
          `Your blocking settings have been saved. Apps are NOT blocked yet. Tap "Bliss Alarm" to activate blocking when ready.`,
          [{ text: 'OK' }]
        );
        
        router.replace('/(tabs)/appblock');
      }
      
    } catch (error) {
      console.error('💥 Error saving schedule:', error);
      Alert.alert('Save Failed', 'Failed to save your settings. Please try again.');
    }
  };
  
  // Delete the schedule
  const deleteSchedule = async () => {
    try {
      // Remove from AsyncStorage
      const savedSchedulesJson = await AsyncStorage.getItem('appBlockSchedules');
      if (savedSchedulesJson) {
        const allSchedules = JSON.parse(savedSchedulesJson);
        const updatedSchedules = allSchedules.filter((s: any) => s.id !== schedule.id);
        await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(updatedSchedules));
      }
      
      // Navigate back to app blocking tab
      router.replace('/(tabs)/appblock');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete schedule. Please try again.');
    }
  };
  
  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle time picker changes
  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSchedule(prev => {
        const newEndTime = new Date(prev.endTime);
        newEndTime.setHours(selectedDate.getHours());
        newEndTime.setMinutes(selectedDate.getMinutes());
        return {...prev, endTime: newEndTime};
      });
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          title: isNew ? 'New Blocker' : 'Edit Blocker',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Spacer to push content to bottom */}
        <View style={styles.topSpacer} />
        
        {/* Block Device Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Block Device</Text>
          <View style={styles.deviceOptions}>
            <TouchableOpacity 
              style={[styles.deviceOption, schedule.selectedDevice === 'qr' && styles.deviceOptionSelected]}
              onPress={() => saveDeviceSelection('qr')}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
              <Text style={styles.deviceOptionText}>QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.deviceOption, schedule.selectedDevice === 'nfc' && styles.deviceOptionSelected]}
              onPress={() => saveDeviceSelection('nfc')}
            >
              <Ionicons name="card-outline" size={24} color="#fff" />
              <Text style={styles.deviceOptionText}>NFC Card</Text>
            </TouchableOpacity>
          </View>
          
          {/* Show appropriate setup button based on device selection */}
          {schedule.selectedDevice === 'qr' && (
            <TouchableOpacity 
              style={[styles.qrSetupButton, hasQRCode && styles.qrSetupButtonSaved]}
              onPress={() => router.push('/appblock/qr-setup')}
            >
              <Ionicons 
                name={hasQRCode ? "checkmark-circle" : "qr-code"} 
                size={20} 
                color={hasQRCode ? "#34C759" : "#0A84FF"} 
              />
              <Text style={[styles.qrSetupButtonText, hasQRCode && styles.qrSetupButtonTextSaved]}>
                {hasQRCode ? "QR Code Saved" : "Setup QR Code"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
          {/* No setup needed for NFC - all cards have the same string */}
        </View>
        
        {/* Blocked Apps Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Blocked Apps</Text>
          <TouchableOpacity 
            style={styles.selectAppsButton}
            onPress={selectApps}
          >
            <Text style={styles.selectAppsButtonText}>
              {schedule.blockedApps.length > 0 
                ? `${schedule.blockedApps.length} apps selected` 
                : "Select Apps & Websites to Block"}
            </Text>
            <Ionicons name="apps" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <BlockedItemsCount 
          apps={schedule.blockedApps} 
          categories={schedule.blockedCategories} 
          webDomains={schedule.blockedWebDomains} 
        />
        
        <View style={styles.spacer} />
      </ScrollView>
      
      <View style={styles.stickyButtonContainer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveSchedule}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        
        {!isNew && (
          <TouchableOpacity 
            style={styles.blackDeleteButton}
            onPress={deleteSchedule}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
    paddingBottom: 100, // Add space for sticky buttons
  },
  contentContainer: {
    padding: 16,
  },
  headerButton: {
    paddingHorizontal: 10,
  },
  headerButtonText: {
    color: '#FF453A',
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  formInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    color: '#fff',
    fontSize: 16,
  },
  selectAppsButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
  },
  selectAppsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    zIndex: 10,
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  spacer: {
    height: 80, // Space for the sticky button
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  countText: {
    color: '#8E8E93',
    fontSize: 14,
    marginRight: 10,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  blackDeleteButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    color: '#fff',
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputText: {
    fontSize: 16,
    color: '#fff',
  },
  timePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  timePickerDone: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: 'bold',
  },
  timePicker: {
    height: 200,
    width: '100%',
    color: '#FFFFFF',
  },
  topSpacer: {
    height: 100, // Adjust this value based on your design
  },
  deviceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deviceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
  },
  deviceOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deviceOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  qrSetupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  qrSetupButtonText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  qrSetupButtonSaved: {
    backgroundColor: '#1C2E1C',
    borderColor: '#34C759',
  },
  qrSetupButtonTextSaved: {
    color: '#34C759',
  },
}); 