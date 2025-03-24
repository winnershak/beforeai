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
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
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
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (showStartPicker) {
        setSchedule({...schedule, startTime: selectedDate});
      } else if (showEndPicker) {
        setSchedule({...schedule, endTime: selectedDate});
      }
    }
  };
  
  // Done button for time picker
  const handleTimePickerDone = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
  };
  
  // Open app selection picker
  const openAppSelectionPicker = async () => {
    if (Platform.OS === 'ios') {
      try {
        console.log("📱 Opening app selection picker");
        if (ScreenTimeBridge) {
          const selection = await ScreenTimeBridge.showAppSelectionPicker();
          console.log("📱 App selection result:", JSON.stringify(selection));
          
          // Update the schedule with the selected apps
          if (selection && selection.apps && (selection.apps.length > 0 || selection.categories?.length > 0 || selection.webDomains?.length > 0)) {
            console.log(`📱 Selected ${selection.apps.length} apps, ${selection.categories?.length || 0} categories, ${selection.webDomains?.length || 0} web domains`);
            setSchedule({
              ...schedule,
              blockedApps: selection.apps,
              blockedCategories: selection.categories || [],
              blockedWebDomains: selection.webDomains || []
            });
          } else {
            console.log("⚠️ No apps selected or selection canceled");
            Alert.alert(
              "No Apps Selected",
              "You need to select at least one app to block.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (error) {
        console.error('❌ Error showing app selection picker:', error);
      }
    }
  };
  
  // Apply the app blocking schedule
  const applyAppBlockSchedule = async (scheduleToApply: AppBlockSchedule) => {
    if (Platform.OS === 'ios') {
      try {
        console.log("🔒 Starting to apply app block schedule");
        if (ScreenTimeBridge) {
          // Convert the schedule to a format that can be passed to Swift
          const scheduleData = {
            id: scheduleToApply.id,
            startTime: scheduleToApply.startTime.toISOString(),
            endTime: scheduleToApply.endTime.toISOString(),
            blockedApps: scheduleToApply.blockedApps,
            blockedCategories: scheduleToApply.blockedCategories,
            blockedWebDomains: scheduleToApply.blockedWebDomains,
            daysOfWeek: scheduleToApply.daysOfWeek,
            isActive: scheduleToApply.isActive
          };
          
          console.log("📤 Sending schedule data to native module:", JSON.stringify(scheduleData));
          
          const result = await ScreenTimeBridge.applyAppBlockSchedule(scheduleData);
          console.log("📥 Result from native module:", result);
        } else {
          console.log("⚠️ ScreenTimeBridge not available");
        }
      } catch (error) {
        console.error('❌ Error applying app block schedule:', error);
      }
    }
  };
  
  // Save the schedule
  const saveSchedule = async () => {
    console.log("💾 Saving schedule:", JSON.stringify(schedule));
    let newSchedules: AppBlockSchedule[];
    
    if (isNew) {
      newSchedules = [...schedules, schedule];
      console.log("📝 Creating new schedule");
    } else {
      newSchedules = schedules.map(s => 
        s.id === schedule.id ? schedule : s
      );
      console.log("📝 Updating existing schedule");
    }
    
    try {
      await AsyncStorage.setItem('appBlockSchedules', JSON.stringify(newSchedules));
      console.log("✅ Schedule saved to AsyncStorage");
      
      console.log("🔒 Applying app block schedule");
      await applyAppBlockSchedule(schedule);
      console.log("✅ App block applied, navigating back");
      
      router.push('/(tabs)/appblock');
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
    }
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
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.timeInputText}>{formatTime(schedule.startTime)}</Text>
            </TouchableOpacity>
            <Text style={styles.timeInputSeparator}>to</Text>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowEndPicker(true)}
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
            onPress={openAppSelectionPicker}
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
      
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSchedule}
        >
          <Text style={styles.saveButtonText}>Save Schedule</Text>
        </TouchableOpacity>
      </View>
      
      {(showStartPicker || showEndPicker) && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>
              {showStartPicker ? 'Start Time' : 'End Time'}
            </Text>
            <TouchableOpacity onPress={handleTimePickerDone}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={showStartPicker ? schedule.startTime : schedule.endTime}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={onTimeChange}
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
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  spacer: {
    height: 80, // Space for the sticky button
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
}); 