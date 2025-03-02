import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, Modal, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

interface AlarmItemProps {
  alarm: {
    id: string;
    time: string;
    enabled: boolean;
    days: string[];
    mission: string | null;
    label?: string;
    sound: string;
    volume: number;
    vibration: boolean;
  };
  formattedDays: string;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

export function AlarmItem({ alarm, formattedDays, onToggle, onDelete, onDuplicate, onEdit }: AlarmItemProps) {
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    console.log('Alarm data in AlarmItem:', alarm);
  }, [alarm]);

  useEffect(() => {
    console.log('Mission in render:', alarm.mission);
  }, [alarm.mission]);

  // Days of the week for display - in Monday to Sunday order
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  // Convert days from strings to numbers, handling both formats (0-6 and 1-7)
  const selectedDays = alarm.days.map(day => {
    const dayNum = parseInt(day, 10);
    // If using JavaScript day format (0=Sunday), convert to our format (7=Sunday)
    if (dayNum === 0) return 7;
    return dayNum;
  });

  // Log the days to help with debugging
  console.log('AlarmItem - alarm.days:', alarm.days);
  console.log('AlarmItem - selectedDays after conversion:', selectedDays);

  const renderRightActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
    });
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={[styles.rightActions, { opacity }]}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable 
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <View style={styles.container}>
        <Link
          href={{
            pathname: "/new-alarm",
            params: {
              editMode: 'true',
              alarmId: alarm.id,
              time: alarm.time,
              days: alarm.days ? alarm.days.join(',') : '',
              mission: alarm.mission,
            }
          }}
          asChild
        >
          <TouchableOpacity style={styles.mainContent} onPress={onEdit}>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>{alarm.time}</Text>
              <View style={styles.daysContainer}>
                {daysOfWeek.map((day, index) => {
                  // index is 0-6, but our days are 1-7 (Monday to Sunday)
                  const dayNumber = index + 1;
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.day,
                        selectedDays.includes(dayNumber) && styles.selectedDay
                      ]}
                    >
                      {day}
                    </Text>
                  );
                })}
              </View>
              <View style={styles.infoContainer}>
                {alarm.label && (
                  <Text style={styles.label}>{alarm.label}</Text>
                )}
                <Text style={styles.mission}>
                  {alarm.mission && alarm.mission !== 'None' && alarm.mission !== '' 
                    ? `${getMissionEmoji(alarm.mission)} ${alarm.mission}`
                    : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View style={styles.rightControls}>
          <TouchableOpacity 
            onPress={() => setShowOptions(!showOptions)}
            style={styles.optionsButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#666" />
          </TouchableOpacity>
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            trackColor={{ false: '#767577', true: '#00BCD4' }}
            thumbColor={alarm.enabled ? '#fff' : '#f4f3f4'}
            style={styles.switch}
          />
        </View>

        {showOptions && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                onDuplicate();
                setShowOptions(false);
              }}
            >
              <Ionicons name="copy" size={20} color="#fff" />
              <Text style={styles.optionText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                onDelete();
                setShowOptions(false);
              }}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <Text style={[styles.optionText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Swipeable>
  );
}

const getMissionEmoji = (missionType: string) => {
  switch (missionType) {
    case 'Math':
      return '🔢';
    case 'Typing':
      return '⌨️';
    case 'QR/Barcode':
      return '📱';
    case 'Photo':
      return '📸';
    default:
      return '';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainContent: {
    flexDirection: 'row',
    padding: 16,
  },
  timeContainer: {
    flex: 1,
  },
  time: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  day: {
    color: '#666',
    fontSize: 12,
  },
  selectedDay: {
    color: '#00BCD4',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  label: {
    color: '#666',
    fontSize: 14,
  },
  mission: {
    color: '#666',
    fontSize: 14,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
    position: 'absolute',
    right: 0,
    height: '100%',
  },
  optionsButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    right: 16,
    top: 50,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 8,
    zIndex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  rightActions: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  switch: {
    transform: [{ scale: 0.8 }],
  },
}); 