import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

// Function to get XP required for a level
const getXpRequiredForLevel = (level: number): number => {
  // Simple progression: 100 XP for level 1, 200 for level 2, etc.
  return level * 100;
};

export default function TrophiesScreen() {
  const [trophyCount, setTrophyCount] = useState(0);
  const [missionCounts, setMissionCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [stats, setStats] = useState<any>({});
  const params = useLocalSearchParams();
  
  // Mission types
  const missionTypes = [
    'Math', 
    'Typing', 
    'Wordle', 
    'QR/Barcode', 
    'Tetris',
    'Cookie Jam'
  ];
  
  // Mission emoji mapping
  const missionEmojis: Record<string, string> = {
    'Math': '🔢',
    'Typing': '⌨️',
    'Wordle': '🎲',
    'QR/Barcode': '📱',
    'Tetris': '🧩',
    'Cookie Jam': '🔔'
  };
  
  useEffect(() => {
    loadTrophyData();
    loadUserData();
    
    // Check if we need to process a mission completion
    if (params.missionCompleted === 'true' && params.missionType) {
      const normalizedMissionType = String(params.missionType).toLowerCase();
      console.log('Processing mission completion:', normalizedMissionType);
      
      const processCompletionOnce = async () => {
        try {
          // Check if we've already processed this mission completion
          const lastProcessedMission = await AsyncStorage.getItem('lastProcessedMission');
          const currentTimestamp = new Date().getTime();
          
          if (lastProcessedMission) {
            const { type, timestamp } = JSON.parse(lastProcessedMission);
            
            // If the same mission was processed in the last 30 seconds, skip it completely
            if (type === normalizedMissionType && currentTimestamp - timestamp < 30000) {
              console.log('This mission was already processed recently, skipping completely');
              return;
            }
          }
          
          // Save this mission as processed FIRST to prevent race conditions
          await AsyncStorage.setItem('lastProcessedMission', JSON.stringify({
            type: normalizedMissionType,
            timestamp: currentTimestamp
          }));
          
          // Then update mission stats
          await updateMissionStats(normalizedMissionType);
          
          // Then add XP (only once)
          await addXP(50);
          console.log(`Added exactly 50 XP for completing ${normalizedMissionType} mission`);
        } catch (error) {
          console.error('Error processing mission completion:', error);
        }
      };
      
      processCompletionOnce();
    }
  }, [params.missionCompleted, params.missionType]);
  
  const loadTrophyData = async () => {
    try {
      // Load trophy count
      const count = await AsyncStorage.getItem('trophyCount');
      setTrophyCount(count ? parseInt(count) : 0);
      
      // Load streak data
      const currentStreak = await AsyncStorage.getItem('currentStreak');
      setStreak(currentStreak ? parseInt(currentStreak) : 0);
      
      const maxStreakValue = await AsyncStorage.getItem('maxStreak');
      setMaxStreak(maxStreakValue ? parseInt(maxStreakValue) : 0);
      
      // Load mission counts
      const counts: Record<string, number> = {};
      
      // First try to load from missionBreakdown
      const breakdownJson = await AsyncStorage.getItem('missionBreakdown');
      const breakdown = breakdownJson ? JSON.parse(breakdownJson) : {};
      
      // Initialize all mission types with 0
      for (const mission of missionTypes) {
        counts[mission] = 0;
      }
      
      // Update with values from breakdown
      for (const [key, value] of Object.entries(breakdown)) {
        // Try to match the key with a mission type (case-insensitive)
        const matchedMission = missionTypes.find(
          mission => mission.toLowerCase() === key.toLowerCase()
        );
        
        if (matchedMission) {
          counts[matchedMission] = value as number;
        }
      }
      
      // Also check individual count keys for each mission
      for (const mission of missionTypes) {
        // Try different key formats
        const keyFormats = [
          `${mission.toLowerCase().replace(/\s+/g, '')}Count`,
          `${mission.charAt(0).toLowerCase() + mission.slice(1).replace(/\s+/g, '')}Count`,
          `${mission.charAt(0).toUpperCase() + mission.slice(1).replace(/\s+/g, '')}Count`
        ];
        
        for (const key of keyFormats) {
          const count = await AsyncStorage.getItem(key);
          if (count) {
            counts[mission] = parseInt(count);
            break;
          }
        }
      }
      
      // Special case for Cookie Jam - check all possible keys
      const cookieJamKeys = ['cookiejamCount', 'cookieJamCount', 'CookieJamCount'];
      for (const key of cookieJamKeys) {
        const count = await AsyncStorage.getItem(key);
        if (count) {
          counts['Cookie Jam'] = parseInt(count);
          break;
        }
      }
      
      setMissionCounts(counts);
      console.log('Loaded mission counts:', counts);
    } catch (error) {
      console.error('Error loading trophy data:', error);
    }
  };
  
  const loadUserData = async () => {
    try {
      // Load XP and level
      const userXP = await AsyncStorage.getItem('userXP');
      const xpValue = userXP ? parseInt(userXP) : 0;
      setXp(xpValue);
      
      // Calculate level based on XP (100 XP per level)
      const calculatedLevel = Math.floor(xpValue / 100) + 1;
      setLevel(calculatedLevel);
      
      // Calculate XP needed for next level
      const nextLevelXP = calculatedLevel * 100;
      setXpToNextLevel(nextLevelXP);
      
      // Load mission stats
      const statsString = await AsyncStorage.getItem('missionStats');
      if (statsString) {
        const loadedStats = JSON.parse(statsString);
        setStats((prevStats: Record<string, any>) => ({ ...prevStats, ...loadedStats }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  
  const updateMissionStats = async (missionType: string) => {
    try {
      // Get current mission stats
      const statsString = await AsyncStorage.getItem('missionStats');
      let stats = statsString ? JSON.parse(statsString) : {};
      
      // Ensure the mission type exists in stats
      if (!stats[missionType]) {
        stats[missionType] = {
          completed: 0,
          streak: 0,
          bestStreak: 0,
          lastCompleted: null
        };
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Check if this is a consecutive day
      const isConsecutiveDay = 
        stats[missionType].lastCompleted === 
        new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday
      
      // Update stats
      stats[missionType].completed += 1;
      
      if (isConsecutiveDay) {
        stats[missionType].streak += 1;
      } else if (stats[missionType].lastCompleted !== today) {
        // Only reset streak if it's not already completed today
        stats[missionType].streak = 1;
      }
      
      // Update best streak if current streak is better
      if (stats[missionType].streak > stats[missionType].bestStreak) {
        stats[missionType].bestStreak = stats[missionType].streak;
      }
      
      // Update last completed date
      stats[missionType].lastCompleted = today;
      
      // Save updated stats
      await AsyncStorage.setItem('missionStats', JSON.stringify(stats));
      
      // Update state
      setStats(stats);
      
      console.log(`Updated stats for ${missionType}:`, stats[missionType]);
      
      // Also update the mission count
      await loadTrophyData();
    } catch (error) {
      console.error('Error updating mission stats:', error);
    }
  };
  
  // Fix the addXP function to properly handle level ups
  const addXP = async (amount: number) => {
    try {
      // Get the latest XP and level from storage to ensure we have the most up-to-date values
      const storedXP = await AsyncStorage.getItem('userXP');
      const storedLevel = await AsyncStorage.getItem('userLevel');
      
      const currentXP = storedXP ? parseInt(storedXP) : xp;
      const currentLevel = storedLevel ? parseInt(storedLevel) : level;
      
      console.log(`Adding ${amount} XP. Current XP: ${currentXP}, Level: ${currentLevel}`);
      
      // Calculate XP needed for next level using the new progression system
      const currentXpToNextLevel = getXpRequiredForLevel(currentLevel);
      
      // Calculate new XP
      const newXP = currentXP + amount;
      let newLevel = currentLevel;
      
      // Check if level up
      if (newXP >= currentXpToNextLevel) {
        newLevel = currentLevel + 1;
        
        // Reset XP to 0 for the new level
        const remainingXP = newXP - currentXpToNextLevel;
        
        // Recalculate XP needed for next level
        const newXpToNextLevel = getXpRequiredForLevel(newLevel);
        
        console.log(`Level up! New level: ${newLevel}, XP reset to ${remainingXP}/${newXpToNextLevel}`);
        
        // Save new level
        await AsyncStorage.setItem('userLevel', newLevel.toString());
        setLevel(newLevel);
        
        // Save remaining XP
        await AsyncStorage.setItem('userXP', remainingXP.toString());
        setXp(remainingXP);
        
        // Update XP to next level
        setXpToNextLevel(newXpToNextLevel);
      } else {
        // Just update XP, no level up
        await AsyncStorage.setItem('userXP', newXP.toString());
        setXp(newXP);
      }
      
      console.log(`XP updated. New XP: ${newXP}, Level: ${newLevel}`);
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.xpContainer}>
          <View style={styles.xpInfo}>
            <Text style={styles.xpLevel}>Level {level}</Text>
            <Text style={styles.xpText}>{xp} / {xpToNextLevel} XP</Text>
          </View>
          <View style={styles.xpBarContainer}>
            <View 
              style={[
                styles.xpBarFill, 
                { width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 30,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '50%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  xpContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  xpInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLevel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  xpText: {
    color: '#999',
    fontSize: 14,
  },
  xpBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 4,
  },
}); 