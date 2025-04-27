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
  
  const [schedule, setSchedule] = useState<AppBlockSchedule>({
    id: isNew ? Date.now().toString() : scheduleId,
    name: 'App Blocker',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    daysOfWeek: [true, true, true, true, true, true, true], // All days selected by default
    isActive: true,
    blockedApps: [],
    blockedCategories: [],
    blockedWebDomains: []
  });
  
  const [schedules, setSchedules] = useState<AppBlockSchedule[]>([]);
  
  // Add this state
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  // Load schedules and find the one we're editing
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const savedSchedules = await AsyncStorage.getItem('appBlockSchedules');
        if (savedSchedules) {
          const parsed = JSON.parse(savedSchedules);
          // Convert string dates back to Date objects
          const loadedSchedules = parsed.map((s: any) => ({
            ...s,
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime)
          }));
          setSchedules(loadedSchedules);
          
          // Find the schedule we're editing
          if (!isNew) {
            const existingSchedule = loadedSchedules.find((s: AppBlockSchedule) => s.id === scheduleId);
            if (existingSchedule) {
              setSchedule(existingSchedule);
            }
          }
        }
      } catch (error) {
        console.error('Error loading app block schedules:', error);
      }
    };
    
    loadSchedules();
  }, [scheduleId, isNew]);
  
  // Open app selection picker
  const selectApps = async () => {
    if (Platform.OS === 'ios' && ScreenTimeBridge) {
      try {
        // Pass the schedule ID to the picker
        const result = await ScreenTimeBridge.showAppSelectionPicker(schedule.id);
        
        if (result && Object.keys(result).length > 0) {
          console.log('Selected apps:', result);
          
          // Update the schedule with the selected apps
          setSchedule(prev => ({
            ...prev,
            blockedApps: result.apps || [],
            blockedCategories: result.categories || [],
            blockedWebDomains: result.webDomains || []
          }));
        }
      } catch (error) {
        console.error('Error selecting apps:', error);
        Alert.alert('Error', 'Failed to select apps. Please try again.');
      }
    } else {
      Alert.alert('Not Available', 'App blocking is only available on iOS.');
    }
  };
  
  // Save the schedule with improved error handling and data validation
  const saveSchedule = async () => {
    try {
      console.log("Saving schedule with ID:", schedule.id);
      
      // Get the current time
      const now = new Date();
      
      // Create a new Date object for the end time
      const endTime = new Date(schedule.endTime);
      
      // Set the date part of endTime to today
      endTime.setFullYear(now.getFullYear());
      endTime.setMonth(now.getMonth());
      endTime.setDate(now.getDate());
      
      // Now check if we need to adjust the date:
      // 1. If end time is earlier than current time, move to tomorrow
      if (endTime < now) {
        console.log("End time is earlier than current time, moving to tomorrow");
        endTime.setDate(endTime.getDate() + 1);
      }
      
      console.log("Final end time:", endTime);
      
      // Update the schedule with adjusted end time and current start time
      const updatedSchedule = {
        ...schedule,
        startTime: new Date(), // Set start time to current time
        endTime: endTime,      // Use the adjusted end time
        isActive: true         // Ensure it's active
      };
      
      // Create a copy of all schedules
      let allSchedules = [...schedules];
      
      // Find if this schedule already exists
      const existingIndex = allSchedules.findIndex(s => s.id === updatedSchedule.id);
      
      // If it exists, handle removing the old one first
      if (existingIndex !== -1) {
        console.log("Found existing schedule, removing it completely");
        
        // First, remove all shields and stop monitoring
        if (Platform.OS === 'ios' && ScreenTimeBridge) {
          try {
            // Remove all shields
            await ScreenTimeBridge.removeAllShields();
            console.log('All shields removed');
            
            // Stop monitoring for this schedule
            await ScreenTimeBridge.stopMonitoringForSchedule(updatedSchedule.id, 0);
            console.log('Successfully stopped monitoring');
          } catch (error) {
            console.error('Error stopping monitoring:', error);
            // Continue anyway
          }
        }
        
        // Replace the existing schedule
        allSchedules[existingIndex] = updatedSchedule;
        console.log(`Replacing schedule at index ${existingIndex}`);
      } else {
        // Add as new schedule
        allSchedules.push(updatedSchedule);
        console.log("Adding new schedule");
      }
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(allSchedules));
      console.log("Saved schedules to AsyncStorage");
      
      // Apply the schedule to ScreenTime
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        const result = await ScreenTimeBridge.applyAppBlockSchedule(updatedSchedule);
        console.log("Applied updated schedule to ScreenTime:", result);
      }
      
      // Navigate to app blocking tab
      router.replace('/(tabs)/appblock');
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    }
  };
  
  // Delete the schedule
  const deleteSchedule = async () => {
    try {
      // First deactivate the schedule
      const deactivatedSchedule = {
        ...schedule,
        isActive: false
      };
      
      // Apply the deactivated schedule to remove all blocks
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        await ScreenTimeBridge.applyAppBlockSchedule(deactivatedSchedule);
        console.log("Deactivated schedule for deletion");
        
        // Use the methods we know work
        try {
          // First, remove all shields
          await ScreenTimeBridge.removeAllShields();
          console.log('All shields removed for deletion');
          
          // Then stop monitoring for this schedule
          await ScreenTimeBridge.stopMonitoringForSchedule(schedule.id, 0);
          console.log('Successfully stopped monitoring for deletion');
        } catch (error) {
          console.error('Error stopping monitoring for deletion:', error);
        }
      }
      
      // Remove from AsyncStorage
      const savedSchedulesJson = await AsyncStorage.getItem('appBlockSchedules');
      if (savedSchedulesJson) {
        const allSchedules = JSON.parse(savedSchedulesJson);
        const updatedSchedules = allSchedules.filter((s: any) => s.id !== schedule.id);
        await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(updatedSchedules));
      }
      
      // Navigate to app blocking tab
      router.replace('/(tabs)/appblock');
    } catch (error) {
      console.error('Error deleting schedule:', error);
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
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            value={schedule.name}
            onChangeText={(text) => setSchedule({...schedule, name: text})}
            placeholder="Enter blocker name"
            placeholderTextColor="#666"
          />
        </View>
        
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
        
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>End Time</Text>
          <TouchableOpacity 
            style={styles.timeInput}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text style={styles.timeInputText}>{formatTime(schedule.endTime)}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
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
      
      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && showEndTimePicker && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select End Time</Text>
            <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={schedule.endTime}
            mode="time"
            display="spinner"
            onChange={handleEndTimeChange}
            textColor="#FFFFFF"
            style={styles.timePicker}
          />
        </View>
      )}
      
      {/* Time Picker for Android */}
      {Platform.OS === 'android' && showEndTimePicker && (
        <DateTimePicker
          value={schedule.endTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
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
}); 