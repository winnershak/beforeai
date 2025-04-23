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
  Alert
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const { ScreenTimeBridge } = NativeModules;

// Define the app block schedule type
interface AppBlockSchedule {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  daysOfWeek: boolean[];
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
    name: 'Sleep Time',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    daysOfWeek: [true, true, true, true, true, true, true],
    isActive: true,
    blockedApps: [],
    blockedCategories: [],
    blockedWebDomains: []
  });
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [schedules, setSchedules] = useState<AppBlockSchedule[]>([]);
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
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
  
  // Toggle a day of the week
  const toggleDay = (dayIndex: number) => {
    const newDays = [...schedule.daysOfWeek];
    newDays[dayIndex] = !newDays[dayIndex];
    setSchedule({...schedule, daysOfWeek: newDays});
  };
  
  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle time picker changes
  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSchedule({...schedule, startTime: selectedDate});
    }
  };
  
  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSchedule({...schedule, endTime: selectedDate});
    }
  };
  
  // Function to toggle time pickers
  const toggleStartTimePicker = () => {
    setShowStartTimePicker(prev => !prev);
    setShowEndTimePicker(false); // Close other picker if open
  };
  
  const toggleEndTimePicker = () => {
    setShowStartTimePicker(false); // Close other picker if open
    setShowEndTimePicker(prev => !prev);
  };
  
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
      
      // First, completely remove the existing schedule from ScreenTime
      if (Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // Get the existing schedule to see what apps were previously blocked
          const savedSchedulesJson = await AsyncStorage.getItem('appBlockSchedules');
          if (savedSchedulesJson) {
            const existingSchedules = JSON.parse(savedSchedulesJson);
            const existingSchedule = existingSchedules.find((s: any) => s.id === schedule.id);
            
            if (existingSchedule) {
              console.log("Found existing schedule, removing it completely");
              
              // First deactivate the schedule by setting isActive to false
              const deactivatedSchedule = {
                ...existingSchedule,
                isActive: false
              };
              
              // Apply the deactivated schedule to remove all blocks
              await ScreenTimeBridge.applyAppBlockSchedule(deactivatedSchedule);
              console.log("Deactivated existing schedule");
              
              // Then completely remove the schedule
              await ScreenTimeBridge.removeSchedule(schedule.id);
              console.log("Removed existing schedule from ScreenTime");
            }
          }
        } catch (error) {
          console.log("Error removing existing schedule:", error);
        }
      }
      
      // Create a clean copy of the schedule with proper date serialization
      const updatedSchedule = {
        ...schedule,
        startTime: schedule.startTime.toISOString(),
        endTime: schedule.endTime.toISOString(),
        blockedApps: schedule.blockedApps || [],
        blockedCategories: schedule.blockedCategories || [],
        blockedWebDomains: schedule.blockedWebDomains || []
      };
      
      // Update AsyncStorage
      const savedSchedulesJson = await AsyncStorage.getItem('appBlockSchedules');
      let allSchedules = [];
      
      if (savedSchedulesJson) {
        // Parse existing schedules
        allSchedules = JSON.parse(savedSchedulesJson);
        
        // Find the index of the schedule we're editing
        const existingIndex = allSchedules.findIndex((s: any) => s.id === schedule.id);
        
        if (existingIndex !== -1) {
          // Replace the existing schedule
          console.log(`Replacing schedule at index ${existingIndex}`);
          allSchedules[existingIndex] = updatedSchedule;
        } else {
          // Add as new schedule
          console.log("Adding new schedule");
          allSchedules.push(updatedSchedule);
        }
      } else {
        // No existing schedules
        allSchedules = [updatedSchedule];
      }
      
      // Save updated schedules to storage
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(allSchedules));
      console.log("Saved schedules to AsyncStorage");
      
      // Apply the updated schedule to ScreenTime if active
      if (schedule.isActive && Platform.OS === 'ios' && ScreenTimeBridge) {
        try {
          // Small delay to ensure previous removal is complete
          await new Promise(resolve => setTimeout(resolve, 300));
          
          await ScreenTimeBridge.applyAppBlockSchedule(updatedSchedule);
          console.log("Applied updated schedule to ScreenTime");
        } catch (error) {
          console.error("Error applying to ScreenTime:", error);
        }
      }
      
      // Navigate to app blocking tab and force a refresh
      router.replace('/(tabs)/appblock');
    } catch (error) {
      console.error("Error saving schedule:", error);
      Alert.alert("Error", "Failed to save schedule. Please try again.");
    }
  };
  
  // Function to confirm schedule deletion
  const confirmDelete = () => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get existing schedules, filter out the current one
              const newSchedules = schedules.filter(s => s.id !== schedule.id);
              
              // Update AsyncStorage
              await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(newSchedules));
              
              // Remove from iOS Screen Time
              if (Platform.OS === 'ios' && ScreenTimeBridge) {
                try {
                  // Create properly formatted data matching what's in applyAppBlockSchedule function
                  const deleteData = {
                    id: schedule.id,
                    startTime: schedule.startTime.toISOString(),
                    endTime: schedule.endTime.toISOString(),
                    blockedApps: schedule.blockedApps, // Keep original arrays
                    blockedCategories: schedule.blockedCategories,
                    blockedWebDomains: schedule.blockedWebDomains,
                    daysOfWeek: schedule.daysOfWeek,
                    isActive: false // Just set to inactive
                  };
                
                  console.log("🗑️ Removing schedule from Screen Time:", schedule.id);
                  await ScreenTimeBridge.applyAppBlockSchedule(deleteData);
                } catch (error) {
                  console.error("Error disabling schedule in Screen Time:", error);
                }
              }
              
              // Navigate to app blocking screen instead of back
              router.push('/(tabs)/appblock');
            } catch (err) {
              console.error('Error deleting schedule:', err);
              // Still navigate even if there's an error
              router.push('/(tabs)/appblock');
            }
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: isNew ? 'New Schedule' : 'Edit Schedule',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: '600',
          },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/appblock')}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            value={schedule.name}
            onChangeText={(text) => setSchedule({...schedule, name: text})}
            placeholder="Schedule Name"
            placeholderTextColor="#666"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Time</Text>
          <View style={styles.timeInputContainer}>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={toggleStartTimePicker}
            >
              <Text style={styles.timeInputText}>{formatTime(schedule.startTime)}</Text>
            </TouchableOpacity>
            <Text style={styles.timeInputSeparator}>to</Text>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={toggleEndTimePicker}
            >
              <Text style={styles.timeInputText}>{formatTime(schedule.endTime)}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Days</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  schedule.daysOfWeek[index] && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    schedule.daysOfWeek[index] && styles.dayButtonTextActive
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            onPress={confirmDelete}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showStartTimePicker && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Start Time</Text>
            <TouchableOpacity onPress={toggleStartTimePicker}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={schedule.startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartTimeChange}
            textColor="#FFFFFF"
            style={styles.timePicker}
          />
        </View>
      )}

      {showEndTimePicker && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select End Time</Text>
            <TouchableOpacity onPress={toggleEndTimePicker}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={schedule.endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndTimeChange}
            textColor="#FFFFFF"
            style={styles.timePicker}
          />
        </View>
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
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  timeInputText: {
    fontSize: 16,
    color: '#fff',
  },
  timeInputSeparator: {
    marginHorizontal: 12,
    color: '#fff',
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  dayButtonTextActive: {
    color: '#fff',
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
  timePickerContainer: {
    position: 'absolute',
    top: '25%',  // Position from top
    left: 0,     // Start at left edge
    right: 0,    // Extend to right edge
    width: '100%', // Take full width
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000,
    alignSelf: 'center', // Center horizontally
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
}); 