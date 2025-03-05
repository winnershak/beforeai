import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Define achievement types
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  reward: number; // XP reward
}

interface MissionStats {
  wordle: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
  math: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
  typing: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
  photo: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
  qr: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
  tetris: {
    completed: number;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
}

export default function TrophiesScreen() {
  const params = useLocalSearchParams();
  const showAnimation = params.showAnimation === 'true';
  const missionType = params.missionType as string;
  
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<MissionStats>({
    wordle: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
    math: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
    typing: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
    photo: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
    qr: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
    tetris: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
  });
  const [showNewAchievement, setShowNewAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(0.5)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  // Add this useEffect to show animation when coming from a completed mission
  useEffect(() => {
    if (showAnimation) {
      // Vibrate the device
      Vibration.vibrate([0, 100, 200, 300]);
      
      // Show animation for the specific mission type
      const missionAchievement = achievements.find(a => {
        if (missionType === 'wordle' && a.id === 'word_master') return true;
        if (missionType === 'math' && a.id === 'math_genius') return true;
        if (missionType === 'typing' && a.id === 'typing_pro') return true;
        if (missionType === 'photo' && a.id === 'photographer') return true;
        if (missionType === 'qr' && a.id === 'scanner') return true;
        if (missionType === 'tetris' && a.id === 'tetris_master') return true;
        return false;
      });
      
      if (missionAchievement) {
        setNewAchievement(missionAchievement);
        setShowNewAchievement(true);
        
        // Animate the achievement popup
        scaleAnim.setValue(0.5);
        opacityAnim.setValue(0);
        rotateAnim.setValue(0);
        
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(rotateAnim, {
              toValue: -1,
              duration: 400,
              useNativeDriver: true
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true
            })
          ])
        ]).start();
      }
      
      // Check achievements after loading data
      setTimeout(() => {
        checkAchievements();
      }, 1000);
    }
  }, [showAnimation, missionType, achievements]);

  const loadUserData = async () => {
    try {
      // Load XP and level
      const xpString = await AsyncStorage.getItem('userXP');
      const levelString = await AsyncStorage.getItem('userLevel');
      
      if (xpString) setXp(parseInt(xpString));
      if (levelString) setLevel(parseInt(levelString));
      
      // Calculate XP needed for next level (increases with each level)
      setXpToNextLevel(100 + (level * 50));
      
      // Load mission stats
      const statsString = await AsyncStorage.getItem('missionStats');
      if (statsString) {
        const loadedStats = JSON.parse(statsString);
        
        // Ensure all mission types exist in the stats object
        const defaultStats = { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null };
        
        const completeStats = {
          wordle: loadedStats.wordle || defaultStats,
          math: loadedStats.math || defaultStats,
          typing: loadedStats.typing || defaultStats,
          photo: loadedStats.photo || defaultStats,
          qr: loadedStats.qr || defaultStats,
          tetris: loadedStats.tetris || defaultStats
        };
        
        setStats(completeStats);
      }
      
      // Load achievements
      const achievementsString = await AsyncStorage.getItem('achievements');
      if (achievementsString) {
        setAchievements(JSON.parse(achievementsString));
      } else {
        // Create default achievements if none exist
        const defaultAchievements = [
          {
            id: 'early_bird',
            name: 'Early Bird',
            description: 'Complete 5 missions before 8 AM',
            icon: 'sunny-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 5,
            reward: 50
          },
          {
            id: 'word_master',
            name: 'Word Master',
            description: 'Complete 10 Wordle missions',
            icon: 'text-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
          {
            id: 'math_genius',
            name: 'Math Genius',
            description: 'Complete 10 Math missions',
            icon: 'calculator-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
          {
            id: 'typing_pro',
            name: 'Typing Pro',
            description: 'Complete 10 Typing missions',
            icon: 'keypad-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
          {
            id: 'photographer',
            name: 'Photographer',
            description: 'Complete 10 Photo missions',
            icon: 'camera-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
          {
            id: 'scanner',
            name: 'Scanner',
            description: 'Complete 10 QR/Barcode missions',
            icon: 'qr-code-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
          {
            id: 'streak_master',
            name: 'Streak Master',
            description: 'Complete missions 7 days in a row',
            icon: 'flame-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 7,
            reward: 200
          },
          {
            id: 'mission_addict',
            name: 'Mission Addict',
            description: 'Complete 50 missions total',
            icon: 'trophy-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 50,
            reward: 500
          },
          {
            id: 'tetris_master',
            name: 'Tetris Master',
            description: 'Complete 10 Tetris missions',
            icon: 'grid-outline',
            unlocked: false,
            progress: 0,
            maxProgress: 10,
            reward: 100
          },
        ];
        setAchievements(defaultAchievements);
        AsyncStorage.setItem('achievements', JSON.stringify(defaultAchievements));
      }
      
      // Check for newly unlocked achievements
      checkAchievements();
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkAchievements = () => {
    try {
      // Ensure all mission types exist in the stats object
      const defaultStats = { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null };
      const safeStats = {
        wordle: stats.wordle || defaultStats,
        math: stats.math || defaultStats,
        typing: stats.typing || defaultStats,
        photo: stats.photo || defaultStats,
        qr: stats.qr || defaultStats,
        tetris: stats.tetris || defaultStats
      };
      
      // Calculate total missions completed
      const totalMissions = 
        (safeStats.wordle.completed || 0) + 
        (safeStats.math.completed || 0) + 
        (safeStats.typing.completed || 0) + 
        (safeStats.photo.completed || 0) + 
        (safeStats.qr.completed || 0) +
        (safeStats.tetris.completed || 0);
      
      const updatedAchievements = [...achievements];
      let achievementUnlocked = false;
      let newlyUnlockedAchievement = null;
      
      // Update progress for each achievement
      updatedAchievements.forEach(achievement => {
        switch(achievement.id) {
          case 'word_master':
            achievement.progress = safeStats.wordle.completed;
            break;
          case 'math_genius':
            achievement.progress = safeStats.math.completed;
            break;
          case 'typing_pro':
            achievement.progress = safeStats.typing.completed;
            break;
          case 'photographer':
            achievement.progress = safeStats.photo.completed;
            break;
          case 'scanner':
            achievement.progress = safeStats.qr.completed;
            break;
          case 'streak_master':
            // Get the max streak from any mission type
            achievement.progress = Math.max(
              safeStats.wordle.streak,
              safeStats.math.streak,
              safeStats.typing.streak,
              safeStats.photo.streak,
              safeStats.qr.streak
            );
            break;
          case 'mission_addict':
            achievement.progress = totalMissions;
            break;
          case 'tetris_master':
            achievement.progress = safeStats.tetris.completed;
            break;
        }
        
        // Check if achievement should be unlocked
        if (!achievement.unlocked && achievement.progress >= achievement.maxProgress) {
          achievement.unlocked = true;
          achievementUnlocked = true;
          newlyUnlockedAchievement = achievement;
        }
      });
      
      if (achievementUnlocked && newlyUnlockedAchievement) {
        setNewAchievement(newlyUnlockedAchievement);
        setShowNewAchievement(true);
        
        // Animate the achievement popup
        scaleAnim.setValue(0.5);
        opacityAnim.setValue(0);
        rotateAnim.setValue(0);
        
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(rotateAnim, {
              toValue: -1,
              duration: 400,
              useNativeDriver: true
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true
            })
          ])
        ]).start();
        
        // Fix the type error by checking if the reward property exists
        if (typeof newlyUnlockedAchievement === 'object' && 
            newlyUnlockedAchievement !== null && 
            'reward' in newlyUnlockedAchievement) {
          // Cast the entire object to Achievement type
          const achievement = newlyUnlockedAchievement as Achievement;
          addXP(achievement.reward);
        }
      }
      
      setAchievements(updatedAchievements);
      AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const addXP = async (amount: number) => {
    const newXP = xp + amount;
    let newLevel = level;
    
    // Check if level up
    if (newXP >= xpToNextLevel) {
      newLevel = level + 1;
      // Save new level
      await AsyncStorage.setItem('userLevel', newLevel.toString());
      setLevel(newLevel);
      
      // Recalculate XP needed for next level
      const newXpToNextLevel = 100 + (newLevel * 50);
      setXpToNextLevel(newXpToNextLevel);
    }
    
    // Save new XP
    await AsyncStorage.setItem('userXP', newXP.toString());
    setXp(newXP);
  };

  const dismissAchievement = () => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowNewAchievement(false);
      setNewAchievement(null);
    });
  };

  // Calculate total missions completed
  const totalMissions = 
    stats.wordle.completed + 
    stats.math.completed + 
    stats.typing.completed + 
    stats.photo.completed + 
    stats.qr.completed +
    stats.tetris.completed;
  
  // Calculate current streak (sum of all active streaks)
  const currentStreak = 
    stats.wordle.streak + 
    stats.math.streak + 
    stats.typing.streak + 
    stats.photo.streak + 
    stats.qr.streak +
    stats.tetris.streak;
  
  // Calculate best streak (max of all best streaks)
  const bestStreak = Math.max(
    stats.wordle.bestStreak,
    stats.math.bestStreak,
    stats.typing.bestStreak,
    stats.photo.bestStreak,
    stats.qr.bestStreak,
    stats.tetris.bestStreak
  );

  // Calculate XP progress percentage
  const xpProgress = Math.min((xp / xpToNextLevel) * 100, 100);
  
  // Rotate animation for trophy
  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-30deg', '0deg', '30deg']
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true }} />
      
      <ScrollView style={styles.container}>
        {/* Level and XP */}
        <View style={styles.levelContainer}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{level}</Text>
          </View>
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>
              {xp} / {xpToNextLevel} XP
            </Text>
            <View style={styles.xpBarBackground}>
              <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
            </View>
          </View>
        </View>
        
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalMissions}</Text>
              <Text style={styles.statLabel}>Missions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        </View>
        
        {/* Mission Breakdown */}
        <View style={styles.missionBreakdown}>
          <Text style={styles.sectionTitle}>Mission Breakdown</Text>
          
          <View style={styles.missionTypeContainer}>
            <Ionicons name="text" size={24} color="#538d4e" />
            <View style={styles.missionTypeInfo}>
              <Text style={styles.missionTypeName}>Wordle</Text>
              <View style={styles.missionTypeStats}>
                <Text style={styles.missionTypeCount}>{stats.wordle?.completed || 0}</Text>
                <Text style={styles.missionTypeLabel}>completed</Text>
              </View>
            </View>
            <View style={styles.missionStreakContainer}>
              <Ionicons 
                name="flame" 
                size={16} 
                color={(stats.wordle?.streak || 0) > 0 ? "#FF4500" : "#666"} 
              />
              <Text style={styles.missionStreakLabel}>{stats.wordle?.streak || 0}</Text>
            </View>
          </View>
          
          <View style={styles.missionTypeContainer}>
            <Ionicons name="calculator" size={24} color="#4169E1" />
            <View style={styles.missionTypeInfo}>
              <Text style={styles.missionTypeName}>Math</Text>
              <View style={styles.missionTypeStats}>
                <Text style={styles.missionTypeCount}>{stats.math?.completed || 0}</Text>
                <Text style={styles.missionTypeLabel}>completed</Text>
              </View>
            </View>
            <View style={styles.missionStreakContainer}>
              <Ionicons 
                name="flame" 
                size={16} 
                color={(stats.math?.streak || 0) > 0 ? "#FF4500" : "#666"} 
              />
              <Text style={styles.missionStreakLabel}>{stats.math?.streak || 0}</Text>
            </View>
          </View>
          
          <View style={styles.missionTypeContainer}>
            <Ionicons name="keypad" size={24} color="#9370DB" />
            <View style={styles.missionTypeInfo}>
              <Text style={styles.missionTypeName}>Typing</Text>
              <View style={styles.missionTypeStats}>
                <Text style={styles.missionTypeCount}>{stats.typing?.completed || 0}</Text>
                <Text style={styles.missionTypeLabel}>completed</Text>
              </View>
            </View>
            <View style={styles.missionStreakContainer}>
              <Ionicons 
                name="flame" 
                size={16} 
                color={(stats.typing?.streak || 0) > 0 ? "#FF4500" : "#666"} 
              />
              <Text style={styles.missionStreakLabel}>{stats.typing?.streak || 0}</Text>
            </View>
          </View>
          
          <View style={styles.missionTypeContainer}>
            <Ionicons name="camera" size={24} color="#20B2AA" />
            <View style={styles.missionTypeInfo}>
              <Text style={styles.missionTypeName}>Photo</Text>
              <View style={styles.missionTypeStats}>
                <Text style={styles.missionTypeCount}>{stats.photo?.completed || 0}</Text>
                <Text style={styles.missionTypeLabel}>completed</Text>
              </View>
            </View>
            <View style={styles.missionStreakContainer}>
              <Ionicons 
                name="flame" 
                size={16} 
                color={(stats.photo?.streak || 0) > 0 ? "#FF4500" : "#666"} 
              />
              <Text style={styles.missionStreakLabel}>{stats.photo?.streak || 0}</Text>
            </View>
          </View>
          
          <View style={styles.missionTypeContainer}>
            <Ionicons name="qr-code" size={24} color="#FFA500" />
            <View style={styles.missionTypeInfo}>
              <Text style={styles.missionTypeName}>QR/Barcode</Text>
              <View style={styles.missionTypeStats}>
                <Text style={styles.missionTypeCount}>{stats.qr?.completed || 0}</Text>
                <Text style={styles.missionTypeLabel}>completed</Text>
              </View>
            </View>
            <View style={styles.missionStreakContainer}>
              <Ionicons 
                name="flame" 
                size={16} 
                color={(stats.qr?.streak || 0) > 0 ? "#FF4500" : "#666"} 
              />
              <Text style={styles.missionStreakLabel}>{stats.qr?.streak || 0}</Text>
            </View>
          </View>
          
          <View style={styles.missionStatsItem}>
            <Text style={styles.missionStatsLabel}>Tetris</Text>
            <View style={styles.missionStatsRow}>
              <View style={styles.missionStat}>
                <Text style={styles.missionStatValue}>{stats.tetris?.completed || 0}</Text>
                <Text style={styles.missionStatLabel}>Completed</Text>
              </View>
              <View style={styles.missionStat}>
                <Text style={styles.missionStatValue}>{stats.tetris?.bestStreak || 0}</Text>
                <Text style={styles.missionStatLabel}>Best Streak</Text>
              </View>
              <View style={styles.missionStreakContainer}>
                <Ionicons 
                  name="flame" 
                  size={16} 
                  color={(stats.tetris?.streak || 0) > 0 ? "#FF4500" : "#666"} 
                />
                <Text style={styles.missionStreakLabel}>{stats.tetris?.streak || 0}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Achievements */}
        <View style={styles.achievementsContainer}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          
          {achievements.map(achievement => (
            <View 
              key={achievement.id} 
              style={[
                styles.achievementItem, 
                achievement.unlocked && styles.achievementUnlocked
              ]}
            >
              <View style={styles.achievementIconContainer}>
                <Ionicons 
                  name={achievement.icon as any} 
                  size={24} 
                  color={achievement.unlocked ? "#FFD700" : "#999"} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <View style={styles.achievementProgressContainer}>
                  <View style={styles.achievementProgressBar}>
                    <View 
                      style={[
                        styles.achievementProgressFill, 
                        { 
                          width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%`,
                          backgroundColor: achievement.unlocked ? "#FFD700" : "#4169E1"
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {achievement.progress}/{achievement.maxProgress}
                  </Text>
                </View>
              </View>
              <View style={styles.achievementReward}>
                <Text style={styles.achievementRewardValue}>{achievement.reward}</Text>
                <Text style={styles.achievementRewardLabel}>XP</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* New Achievement Popup */}
      {showNewAchievement && newAchievement && (
        <View style={styles.newAchievementContainer}>
          <Animated.View 
            style={[
              styles.newAchievementContent,
              {
                opacity: opacityAnim,
                transform: [
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="trophy" size={100} color="#FFD700" />
            </Animated.View>
            <Text style={styles.newAchievementTitle}>Achievement Unlocked!</Text>
            <Text style={styles.newAchievementName}>{newAchievement.name}</Text>
            <Text style={styles.newAchievementDescription}>{newAchievement.description}</Text>
            <TouchableOpacity 
              style={styles.newAchievementReward}
              onPress={dismissAchievement}
            >
              <Text style={styles.newAchievementRewardText}>
                +{newAchievement.reward} XP
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    margin: 15,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  levelText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  xpContainer: {
    flex: 1,
  },
  xpText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  xpBarBackground: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#4169E1',
  },
  statsContainer: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    margin: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  missionBreakdown: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    margin: 15,
  },
  missionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  missionTypeInfo: {
    flex: 1,
    marginLeft: 15,
  },
  missionTypeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  missionTypeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  missionTypeCount: {
    color: '#4169E1',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
  missionTypeLabel: {
    color: '#999',
    fontSize: 12,
  },
  missionStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionStreakLabel: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  achievementsContainer: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    margin: 15,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  achievementUnlocked: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementDescription: {
    color: '#999',
    fontSize: 12,
    marginTop: 3,
    marginBottom: 8,
  },
  achievementProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  achievementProgressFill: {
    height: '100%',
  },
  achievementProgressText: {
    color: '#999',
    fontSize: 12,
  },
  achievementReward: {
    alignItems: 'center',
    marginLeft: 10,
  },
  achievementRewardValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementRewardLabel: {
    color: '#999',
    fontSize: 10,
  },
  newAchievementContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
  newAchievementContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  newAchievementTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  newAchievementName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  newAchievementDescription: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  newAchievementReward: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newAchievementRewardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  missionStatsItem: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    margin: 15,
  },
  missionStatsLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  missionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  missionStat: {
    alignItems: 'center',
    flex: 1,
  },
  missionStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  missionStatLabel: {
    color: '#999',
    fontSize: 12,
  },
}); 