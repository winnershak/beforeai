import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, PanResponder } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';

// Game constants
const GRID_SIZE = 8;
const MIN_MATCH = 3;
const COOKIE_TYPES = ['🍎', '🍇', '🍊', '🫐', '🍓', '🍌'];
const ANIMATION_DURATION = 300; // Slightly longer for better visuals

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const CELL_SIZE = width / (GRID_SIZE + 1);

export default function FinalCookieJamGame() {
  const params = useLocalSearchParams();
  const { alarmId } = params;
  
  // Game state
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(15);
  const [targetScore, setTargetScore] = useState(300);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Sound refs
  const swapSound = useRef<Audio.Sound | null>(null);
  const matchSound = useRef<Audio.Sound | null>(null);
  const successSound = useRef<Audio.Sound | null>(null);
  const backgroundMusic = useRef<Audio.Sound | null>(null);
  
  // Animation refs
  const cellScales = useRef<Animated.Value[][]>([]);
  const cellOpacities = useRef<Animated.Value[][]>([]);
  
  // Add a debounce mechanism for match sounds
  const lastMatchSoundTime = useRef(0);
  
  // Initialize the game
  useEffect(() => {
    // Initialize animation values
    for (let i = 0; i < GRID_SIZE; i++) {
      cellScales.current[i] = [];
      cellOpacities.current[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        cellScales.current[i][j] = new Animated.Value(1);
        cellOpacities.current[i][j] = new Animated.Value(1);
      }
    }
    
    // Load game settings and sounds
    const loadSettingsAndSounds = async () => {
      try {
        // Load settings
        const settingsJson = await AsyncStorage.getItem('cookieJamSettings');
        if (settingsJson) {
          const settings = JSON.parse(settingsJson);
          if (settings.targetScore) {
            setTargetScore(settings.targetScore);
          }
        }
        
        // Load sounds
        await loadSounds();
        
        // Start background music
        playBackgroundMusic();
      } catch (error) {
        console.error('Error loading settings or sounds:', error);
      }
      
      initializeGame();
    };
    
    loadSettingsAndSounds();
    
    // Cleanup function
    return () => {
      unloadSounds();
    };
  }, []);
  
  // Load sound effects
  const loadSounds = async () => {
    try {
      // Load swap sound (slice.caf)
      const { sound: swap } = await Audio.Sound.createAsync(
        require('../assets/sounds/slice.caf')
      );
      swapSound.current = swap;
      
      // Load match sound (quiet-boom.caf) with higher volume
      const { sound: match } = await Audio.Sound.createAsync(
        require('../assets/sounds/quiet-boom.caf'),
        { volume: 1.0 } // Set to maximum volume
      );
      matchSound.current = match;
      
      // Load success sound (completeword.caf)
      const { sound: success } = await Audio.Sound.createAsync(
        require('../assets/sounds/completeword.caf')
      );
      successSound.current = success;
      
      // Load background music (tetris.caf)
      const { sound: bgMusic } = await Audio.Sound.createAsync(
        require('../assets/sounds/tetris.caf'),
        { isLooping: true, volume: 0.5 }
      );
      backgroundMusic.current = bgMusic;
      
      console.log('All sounds loaded successfully');
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };
  
  // Play background music
  const playBackgroundMusic = async () => {
    try {
      if (backgroundMusic.current) {
        await backgroundMusic.current.playAsync();
        console.log('Background music started');
      }
    } catch (error) {
      console.error('Error playing background music:', error);
    }
  };
  
  // Pause background music
  const pauseBackgroundMusic = async () => {
    try {
      if (backgroundMusic.current) {
        await backgroundMusic.current.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing background music:', error);
    }
  };
  
  // Unload sounds to prevent memory leaks
  const unloadSounds = async () => {
    try {
      if (swapSound.current) {
        await swapSound.current.unloadAsync();
      }
      if (matchSound.current) {
        await matchSound.current.unloadAsync();
      }
      if (successSound.current) {
        await successSound.current.unloadAsync();
      }
      if (backgroundMusic.current) {
        await backgroundMusic.current.stopAsync();
        await backgroundMusic.current.unloadAsync();
      }
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  };
  
  // Play a sound effect
  const playSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        
        // Only try to play if the sound isn't already playing
        if (status.isLoaded) {
          // If it's already playing, just let it continue
          if (!status.isPlaying) {
            try {
              // Try to rewind first
              await soundRef.current.setPositionAsync(0);
              // Then play
              await soundRef.current.playAsync();
            } catch (seekError) {
              // If seeking fails, just play from current position
              console.log('Seeking failed, playing from current position');
              await soundRef.current.playAsync();
            }
          }
        }
      }
    } catch (error) {
      // Just log the error but don't let it crash the game
      console.error('Error playing sound:', error);
    }
  };
  
  const initializeGame = () => {
    // Create initial grid with random cookies
    let newGrid;
    let hasMatches = true;
    
    // Keep generating new grids until we get one without initial matches
    while (hasMatches) {
      newGrid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => getRandomCookie())
      );
      
      // Check if this grid has any matches
      hasMatches = checkForMatches(newGrid);
      
      // If it has matches, try again
      if (hasMatches) {
        console.log('Generated grid has initial matches, trying again...');
      }
    }
    
    setGrid(newGrid!);
    setScore(0);
    setMoves(15);
    setGameOver(false);
    setGameStarted(false);
  };
  
  const getRandomCookie = (exclude?: string): string => {
    let cookie;
    do {
      cookie = COOKIE_TYPES[Math.floor(Math.random() * COOKIE_TYPES.length)];
    } while (cookie === exclude);
    return cookie;
  };
  
  // Create pan responder for swipe gestures
  const createPanResponder = (row: number, col: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !gameOver,
      onPanResponderGrant: () => {
        // Highlight the selected cookie
        setSelectedCell({ row, col });
        Animated.spring(cellScales.current[row][col], {
          toValue: 1.2,
          useNativeDriver: true,
          friction: 3
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Determine swipe direction based on gesture
        const { dx, dy } = gestureState;
        
        // Only process if we've moved enough to consider it a swipe
        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
          // Determine which direction has the largest movement
          let targetRow = row;
          let targetCol = col;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            targetCol = dx > 0 ? Math.min(col + 1, GRID_SIZE - 1) : Math.max(col - 1, 0);
          } else {
            // Vertical swipe
            targetRow = dy > 0 ? Math.min(row + 1, GRID_SIZE - 1) : Math.max(row - 1, 0);
          }
          
          // Only process if we're actually moving to a different cell
          if (targetRow !== row || targetCol !== col) {
            // Mark game as started on first player move
            if (!gameStarted) {
              setGameStarted(true);
            }
            
            // Play swap sound
            playSound(swapSound);
            
            // Animate the swap
            swapCookies(row, col, targetRow, targetCol);
            
            // Reset the selected cell
            setSelectedCell(null);
            
            // End the gesture
            return true;
          }
        }
        
        return false;
      },
      onPanResponderRelease: () => {
        // Reset the scale animation
        Animated.spring(cellScales.current[row][col], {
          toValue: 1,
          useNativeDriver: true,
          friction: 3
        }).start();
        
        // Clear selection if no swap was made
        if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
          setSelectedCell(null);
        }
      }
    });
  };
  
  const handleCellPress = (row: number, col: number) => {
    if (gameOver) return;
    
    if (selectedCell === null) {
      // First selection
      setSelectedCell({ row, col });
      
      // Animate the selection
      Animated.spring(cellScales.current[row][col], {
        toValue: 1.2,
        useNativeDriver: true,
        friction: 3
      }).start();
    } else {
      // Second selection - check if it's adjacent
      const isAdjacent = 
        (Math.abs(selectedCell.row - row) === 1 && selectedCell.col === col) ||
        (Math.abs(selectedCell.col - col) === 1 && selectedCell.row === row);
      
      // Reset the first selection's scale
      Animated.spring(cellScales.current[selectedCell.row][selectedCell.col], {
        toValue: 1,
        useNativeDriver: true,
        friction: 3
      }).start();
      
      if (isAdjacent) {
        // Mark game as started on first player move
        if (!gameStarted) {
          setGameStarted(true);
        }
        
        // Play swap sound
        playSound(swapSound);
        
        // Swap cookies
        swapCookies(selectedCell.row, selectedCell.col, row, col);
      }
      
      // Clear selection
      setSelectedCell(null);
    }
  };
  
  const swapCookies = (row1: number, col1: number, row2: number, col2: number) => {
    // Create a copy of the grid
    const newGrid = [...grid.map(row => [...row])];
    
    // Swap the cookies
    const temp = newGrid[row1][col1];
    newGrid[row1][col1] = newGrid[row2][col2];
    newGrid[row2][col2] = temp;
    
    // Update the grid
    setGrid(newGrid);
    
    // Animate the swap
    Animated.parallel([
      Animated.sequence([
        Animated.timing(cellScales.current[row1][col1], {
          toValue: 0.8,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true
        }),
        Animated.timing(cellScales.current[row1][col1], {
          toValue: 1,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.timing(cellScales.current[row2][col2], {
          toValue: 0.8,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true
        }),
        Animated.timing(cellScales.current[row2][col2], {
          toValue: 1,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true
        })
      ])
    ]).start();
    
    // Check if the swap created any matches
    setTimeout(() => {
      const hasMatches = checkForMatches(newGrid);
      
      if (hasMatches) {
        // Play match sound
        playSound(matchSound);
        
        // Process the matches
        processMatches(newGrid, true); // true indicates this is a player move
        
        // Decrement moves
        setMoves(prev => {
          const newMoves = prev - 1;
          
          // Check if game is over
          if (newMoves <= 0 && score < targetScore) {
            handleGameOver(false);
          }
          
          return newMoves;
        });
      } else {
        // No matches, swap back silently with a subtle shake animation
        
        // Create a copy of the grid for swapping back
        const revertGrid = [...newGrid.map(row => [...row])];
        revertGrid[row1][col1] = newGrid[row2][col2];
        revertGrid[row2][col2] = newGrid[row1][col1];
        
        // Add a subtle shake animation to indicate invalid move
        Animated.sequence([
          Animated.timing(cellScales.current[row1][col1], {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(cellScales.current[row1][col1], {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(cellScales.current[row1][col1], {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          })
        ]).start();
        
        Animated.sequence([
          Animated.timing(cellScales.current[row2][col2], {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(cellScales.current[row2][col2], {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(cellScales.current[row2][col2], {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          })
        ]).start();
        
        // Update the grid after a short delay
        setTimeout(() => {
          setGrid(revertGrid);
        }, 300);
      }
    }, ANIMATION_DURATION);
  };
  
  // Find all matches in the grid
  const findMatches = (currentGrid: string[][]): Array<Array<{row: number, col: number}>> => {
    const matches: Array<Array<{row: number, col: number}>> = [];
    
    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      let currentMatch: Array<{row: number, col: number}> = [];
      let currentCookie = '';
      
      for (let col = 0; col < GRID_SIZE; col++) {
        const cookie = currentGrid[row][col];
        
        if (cookie && cookie === currentCookie) {
          // Continue the current match
          currentMatch.push({ row, col });
        } else {
          // Check if we have a match of at least MIN_MATCH
          if (currentMatch.length >= MIN_MATCH) {
            matches.push([...currentMatch]);
          }
          
          // Start a new potential match
          currentMatch = [{ row, col }];
          currentCookie = cookie;
        }
      }
      
      // Check for match at the end of the row
      if (currentMatch.length >= MIN_MATCH) {
        matches.push([...currentMatch]);
      }
    }
    
    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      let currentMatch: Array<{row: number, col: number}> = [];
      let currentCookie = '';
      
      for (let row = 0; row < GRID_SIZE; row++) {
        const cookie = currentGrid[row][col];
        
        if (cookie && cookie === currentCookie) {
          // Continue the current match
          currentMatch.push({ row, col });
        } else {
          // Check if we have a match of at least MIN_MATCH
          if (currentMatch.length >= MIN_MATCH) {
            matches.push([...currentMatch]);
          }
          
          // Start a new potential match
          currentMatch = [{ row, col }];
          currentCookie = cookie;
        }
      }
      
      // Check for match at the end of the column
      if (currentMatch.length >= MIN_MATCH) {
        matches.push([...currentMatch]);
      }
    }
    
    return matches;
  };
  
  // Also add the checkForMatches function that uses findMatches
  const checkForMatches = (currentGrid: string[][]): boolean => {
    const matches = findMatches(currentGrid);
    return matches.length > 0;
  };
  
  // Modified processMatches to debounce sound playing
  const processMatches = (currentGrid: string[][], isPlayerMove: boolean = false) => {
    // Find all matches
    const matches = findMatches(currentGrid);
    
    if (matches.length === 0) {
      return;
    }
    
    // Play match sound for any matches (even cascading ones)
    // But only if it's been at least 300ms since the last sound
    const now = Date.now();
    if (now - lastMatchSoundTime.current > 300) {
      playSound(matchSound);
      lastMatchSoundTime.current = now;
    }
    
    // Create a copy of the grid
    const newGrid = [...currentGrid.map(row => [...row])];
    
    // Clear matched cookies and calculate score
    let matchCount = 0;
    matches.forEach(match => {
      match.forEach(({ row, col }) => {
        // Mark the cell as empty
        newGrid[row][col] = '';
        matchCount++;
        
        // Animate the cell disappearing
        Animated.sequence([
          Animated.timing(cellScales.current[row][col], {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true
          }),
          Animated.timing(cellOpacities.current[row][col], {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
          })
        ]).start(() => {
          // Reset opacity for future use
          cellOpacities.current[row][col].setValue(1);
        });
      });
    });
    
    // Only update score if this is a player move
    if (isPlayerMove && gameStarted) {
      // Update score - 10 points per cookie
      const pointsEarned = matchCount * 10;
      setScore(prevScore => {
        const newScore = prevScore + pointsEarned;
        
        // Check if target reached
        if (newScore >= targetScore && !gameOver) {
          handleGameOver(true);
        }
        
        return newScore;
      });
    }
    
    // After a delay, drop cookies down to fill empty spaces
    setTimeout(() => {
      // Drop cookies down
      for (let col = 0; col < GRID_SIZE; col++) {
        let emptySpaces = 0;
        
        // Start from the bottom and move up
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
          if (newGrid[row][col] === '') {
            emptySpaces++;
          } else if (emptySpaces > 0) {
            // Move this cookie down by the number of empty spaces
            newGrid[row + emptySpaces][col] = newGrid[row][col];
            newGrid[row][col] = '';
            
            // Animate the cookie falling
            Animated.timing(cellScales.current[row][col], {
              toValue: 0,
              duration: 200,
              useNativeDriver: true
            }).start();
            
            // Animate the cookie appearing in new position
            cellScales.current[row + emptySpaces][col].setValue(0);
            Animated.spring(cellScales.current[row + emptySpaces][col], {
              toValue: 1,
              friction: 4,
              useNativeDriver: true
            }).start();
          }
        }
        
        // Fill the top with new cookies
        for (let row = 0; row < emptySpaces; row++) {
          newGrid[row][col] = getRandomCookie();
          
          // Animate new cookies appearing
          cellScales.current[row][col].setValue(0);
          Animated.spring(cellScales.current[row][col], {
            toValue: 1,
            friction: 4,
            useNativeDriver: true
          }).start();
        }
      }
      
      // Update the grid
      setGrid(newGrid);
      
      // Check for new matches after dropping
      setTimeout(() => {
        if (checkForMatches(newGrid)) {
          processMatches(newGrid, isPlayerMove);
        }
      }, 500);
    }, 300);
  };
  
  const handleGameOver = async (success: boolean) => {
    setGameOver(true);
    
    // Pause background music
    pauseBackgroundMusic();
    
    if (success) {
      // Play success sound
      playSound(successSound);
      
      // Show success animation
      setShowSuccess(true);
      
      // Trigger confetti
      setTimeout(() => {
        setShowConfetti(true);
      }, 500);
      
      // Fade in success message
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }).start();
      
      // Mark the alarm as completed
      try {
        if (alarmId) {
          await AsyncStorage.setItem('missionCompleted', 'true');
          await AsyncStorage.setItem(`alarm_${alarmId}_completed`, 'true');
          
          // IMPORTANT: Use consistent mission name
          const missionName = 'Cookie Jam';
          
          // Add to trophy count
          const trophyCount = await AsyncStorage.getItem('trophyCount');
          const newCount = trophyCount ? parseInt(trophyCount) + 1 : 1;
          await AsyncStorage.setItem('trophyCount', newCount.toString());
          
          // Add to mission-specific count - try multiple possible keys
          // First, ensure the mission exists in the completedMissions array
          const completedMissionsJson = await AsyncStorage.getItem('completedMissions');
          let completedMissions = completedMissionsJson ? JSON.parse(completedMissionsJson) : [];
          if (!completedMissions.includes(missionName)) {
            completedMissions.push(missionName);
            await AsyncStorage.setItem('completedMissions', JSON.stringify(completedMissions));
          }
          
          // Update using all possible key formats
          const cookieJamCount = await AsyncStorage.getItem('cookiejamCount') || '0';
          const newCookieJamCount = parseInt(cookieJamCount) + 1;
          
          // Try all possible key formats
          await AsyncStorage.setItem('cookiejamCount', newCookieJamCount.toString());
          await AsyncStorage.setItem('cookieJamCount', newCookieJamCount.toString());
          await AsyncStorage.setItem('CookieJamCount', newCookieJamCount.toString());
          
          // Also update the mission breakdown directly
          const breakdownJson = await AsyncStorage.getItem('missionBreakdown');
          let breakdown = breakdownJson ? JSON.parse(breakdownJson) : {};
          breakdown['Cookie Jam'] = newCookieJamCount;
          await AsyncStorage.setItem('missionBreakdown', JSON.stringify(breakdown));
          
          console.log(`Updated ${missionName} count to ${newCookieJamCount}`);
          
          // Add XP (50 XP for completing Cookie Jam)
          const currentXP = await AsyncStorage.getItem('userXP');
          const newXP = currentXP ? parseInt(currentXP) + 50 : 50;
          await AsyncStorage.setItem('userXP', newXP.toString());
          
          // Update streak
          await updateStreak();
          
          // Navigate back to home after a delay
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 5000);
        }
      } catch (error) {
        console.error('Error saving completion status:', error);
      }
    } else {
      // Failed - restart the alarm
      Alert.alert(
        'Game Over',
        'You ran out of moves! The alarm will continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/alarm-ring',
                params: { alarmId }
              });
            }
          }
        ]
      );
    }
  };
  
  // Function to update streak
  const updateStreak = async () => {
    try {
      // Get the current date
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Get the last completion date
      const lastCompletionDate = await AsyncStorage.getItem('lastCompletionDate');
      
      // Get current streak
      const currentStreakStr = await AsyncStorage.getItem('currentStreak');
      let currentStreak = currentStreakStr ? parseInt(currentStreakStr) : 0;
      
      if (!lastCompletionDate) {
        // First time completing a mission
        currentStreak = 1;
      } else {
        // Check if the last completion was yesterday
        const lastDate = new Date(lastCompletionDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Last completion was yesterday, increment streak
          currentStreak += 1;
        } else if (lastDate.toISOString().split('T')[0] === todayString) {
          // Already completed today, don't change streak
        } else {
          // Streak broken, reset to 1
          currentStreak = 1;
        }
      }
      
      // Update the streak and last completion date
      await AsyncStorage.setItem('currentStreak', currentStreak.toString());
      await AsyncStorage.setItem('lastCompletionDate', todayString);
      
      // Update max streak if needed
      const maxStreakStr = await AsyncStorage.getItem('maxStreak');
      const maxStreak = maxStreakStr ? parseInt(maxStreakStr) : 0;
      
      if (currentStreak > maxStreak) {
        await AsyncStorage.setItem('maxStreak', currentStreak.toString());
      }
      
      console.log(`Streak updated: ${currentStreak}`);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };
  
  // Function to update mission breakdown
  const updateMissionBreakdown = async (missionType: string) => {
    try {
      // Get current mission breakdown
      const breakdownJson = await AsyncStorage.getItem('missionBreakdown');
      let breakdown = breakdownJson ? JSON.parse(breakdownJson) : {};
      
      // Make sure we're using a consistent mission name
      const missionName = 'Cookie Jam'; // Always use this exact name
      
      // Update the count for this mission type
      breakdown[missionName] = (breakdown[missionName] || 0) + 1;
      
      // Save the updated breakdown
      await AsyncStorage.setItem('missionBreakdown', JSON.stringify(breakdown));
      
      // Also update the specific mission count
      const cookieJamCountStr = await AsyncStorage.getItem('cookieJamCount');
      const cookieJamCount = cookieJamCountStr ? parseInt(cookieJamCountStr) + 1 : 1;
      await AsyncStorage.setItem('cookieJamCount', cookieJamCount.toString());
      
      console.log(`Mission breakdown updated: ${missionName} (${cookieJamCount})`);
      
      // Make sure the mission appears in the missions list
      const missionsJson = await AsyncStorage.getItem('completedMissions');
      let missions = missionsJson ? JSON.parse(missionsJson) : [];
      
      // Add this mission if it's not already in the list
      if (!missions.includes(missionName)) {
        missions.push(missionName);
        await AsyncStorage.setItem('completedMissions', JSON.stringify(missions));
      }
    } catch (error) {
      console.error('Error updating mission breakdown:', error);
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      
      <View style={styles.container}>
        {/* Game header */}
        <View style={styles.header}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.targetScore}>Target: {targetScore}</Text>
          </View>
          
          <View style={styles.movesContainer}>
            <Text style={styles.movesLabel}>Moves</Text>
            <Text style={styles.movesValue}>{moves}</Text>
          </View>
        </View>
        
        {/* Game grid */}
        <View style={styles.grid}>
          {grid.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((cookie, colIndex) => {
                // Create pan responder for this cell
                const panResponder = createPanResponder(rowIndex, colIndex);
                
                return (
                  <Animated.View
                    key={`cell-${rowIndex}-${colIndex}`}
                    style={[
                      styles.cell,
                      selectedCell?.row === rowIndex && selectedCell?.col === colIndex && styles.selectedCell,
                      {
                        transform: [{ scale: cellScales.current[rowIndex]?.[colIndex] || new Animated.Value(1) }],
                        opacity: cellOpacities.current[rowIndex]?.[colIndex] || new Animated.Value(1)
                      }
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <Text style={styles.cookie}>{cookie}</Text>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>
        
        {/* Game controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.replace({
              pathname: '/alarm-ring',
              params: { alarmId }
            })}
            disabled={gameOver}
          >
            <Text style={styles.buttonText}>Give Up</Text>
          </TouchableOpacity>
        </View>
        
        {/* Success overlay */}
        {showSuccess && (
          <Animated.View 
            style={[
              styles.successContainer,
              { opacity: successOpacity }
            ]}
          >
            <Text style={styles.successText}>Mission Complete!</Text>
            <Ionicons 
              name="trophy" 
              size={100} 
              color="#FFD700" 
              style={styles.trophyIcon}
            />
          </Animated.View>
        )}
        
        {/* Confetti effect */}
        {showConfetti && (
          <ConfettiCannon
            count={200}
            origin={{ x: width / 2, y: height }}
            autoStart={true}
            fadeOut={true}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
    marginTop: 40,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#999',
    fontSize: 16,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  targetScore: {
    color: '#4CD964',
    fontSize: 14,
  },
  movesContainer: {
    alignItems: 'center',
  },
  movesLabel: {
    color: '#999',
    fontSize: 16,
  },
  movesValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  grid: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 5,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#3A3A3C',
    margin: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCell: {
    borderColor: '#0A84FF',
    borderWidth: 2,
  },
  cookie: {
    fontSize: 32, // Larger emoji size
  },
  controls: {
    width: '100%',
    padding: 20,
  },
  button: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  successText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  trophyIcon: {
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
}); 