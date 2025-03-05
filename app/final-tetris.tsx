import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration, Animated, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';

// Constants for the game
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const EMPTY_CELL = null;

// Define types
interface Tetromino {
  shape: number[][];
  color: string;
}

interface Position {
  x: number;
  y: number;
}

type Board = (string | null)[][];

// Get screen dimensions
const dimensions = Dimensions.get('window');
const screenWidth = dimensions.width;

// Define tetromino shapes and colors
const TETROMINOES: Tetromino[] = [
  {
    // I-piece
    shape: [
      [1, 1, 1, 1]
    ],
    color: '#00FFFF' // Cyan
  },
  {
    // J-piece
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000FF' // Blue
  },
  {
    // L-piece
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#FFA500' // Orange
  },
  {
    // O-piece
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#FFFF00' // Yellow
  },
  {
    // S-piece
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00FF00' // Green
  },
  {
    // T-piece
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#800080' // Purple
  },
  {
    // Z-piece
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#FF0000' // Red
  }
];

// Generate a random tetromino
const generateRandomPiece = (): Tetromino => {
  const randomIndex = Math.floor(Math.random() * TETROMINOES.length);
  return {
    shape: [...TETROMINOES[randomIndex].shape.map(row => [...row])],
    color: TETROMINOES[randomIndex].color
  };
};

// Function to remove completed lines from the board
const removeCompletedLines = (board: Board, completedLines: number[]): Board => {
  const newBoard = [...board];
  
  // Remove the completed lines
  completedLines.forEach(lineIndex => {
    // Remove the completed line
    newBoard.splice(lineIndex, 1);
    // Add a new empty line at the top
    newBoard.unshift(Array(BOARD_WIDTH).fill(EMPTY_CELL));
  });
  
  return newBoard;
};

// Create an empty board
const createEmptyBoard = (): Board => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(EMPTY_CELL));
};

export default function FinalTetrisGame() {
  const params = useLocalSearchParams();
  const { alarmId } = params;
  
  // Game state
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position>({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [linesCleared, setLinesCleared] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [targetScore, setTargetScore] = useState(200);
  
  // Game loop
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fix the state update issue by using a ref to track the current piece
  const currentPieceRef = useRef<Tetromino | null>(null);
  const currentPositionRef = useRef<Position>({ x: 0, y: 0 });
  
  // Check if a move is valid
  const isValidMove = (shape: number[][], x: number, y: number): boolean => {
    if (!shape) return false;
    
    // Check each cell of the piece
    for (let pieceY = 0; pieceY < shape.length; pieceY++) {
      for (let pieceX = 0; pieceX < shape[pieceY].length; pieceX++) {
        // Skip empty cells
        if (!shape[pieceY][pieceX]) continue;
        
        // Calculate the position on the board
        const boardX = x + pieceX;
        const boardY = y + pieceY;
        
        // Check if the piece is out of bounds
        if (
          boardX < 0 || 
          boardX >= BOARD_WIDTH || 
          boardY >= BOARD_HEIGHT
        ) {
          return false;
        }
        
        // Check if the piece overlaps with an existing piece on the board
        if (boardY >= 0 && board[boardY][boardX] !== EMPTY_CELL) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Move the current piece down
  const moveDown = (): void => {
    // Use the ref instead of state
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) {
      console.log('moveDown: No current piece in ref');
      return;
    }
    
    console.log(`moveDown: Current position: (${position.x}, ${position.y})`);
    
    // Check if the piece can move down
    const newY = position.y + 1;
    if (isValidMove(piece.shape, position.x, newY)) {
      console.log(`moveDown: Moving to (${position.x}, ${newY})`);
      
      // Update both state and ref
      const newPosition = { ...position, y: newY };
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
    } else {
      console.log('moveDown: Cannot move down, placing piece');
      // The piece can't move down, so place it on the board
      placePiece();
    }
  };
  
  // Move the current piece left
  const moveLeft = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) return;
    
    const newPosition = { ...position, x: position.x - 1 };
    
    if (isValidMove(piece.shape, newPosition.x, newPosition.y)) {
      // Update both state and ref
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
      // No vibration for basic movements
    }
  };
  
  // Move the current piece right
  const moveRight = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) return;
    
    const newPosition = { ...position, x: position.x + 1 };
    
    if (isValidMove(piece.shape, newPosition.x, newPosition.y)) {
      // Update both state and ref
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
      // No vibration for basic movements
    }
  };
  
  // Rotate the current piece
  const rotate = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) return;
    
    // Create a rotated version of the current shape
    const shape = piece.shape;
    const rotatedShape: number[][] = [];
    
    for (let x = 0; x < shape[0].length; x++) {
      const newRow: number[] = [];
      for (let y = shape.length - 1; y >= 0; y--) {
        newRow.push(shape[y][x]);
      }
      rotatedShape.push(newRow);
    }
    
    // Try the rotation in the current position
    if (isValidMove(rotatedShape, position.x, position.y)) {
      const newPiece = { ...piece, shape: rotatedShape };
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      return;
    }
    
    // If rotation fails, don't allow it
    console.log('Rotation blocked - would cause collision');
  };
  
  // Drop the piece all the way down
  const hardDrop = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) return;
    
    console.log('hardDrop: Starting hard drop');
    
    // Find the lowest valid position
    let newY = position.y;
    
    // Keep moving down until we hit something
    while (isValidMove(piece.shape, position.x, newY + 1)) {
      newY++;
    }
    
    console.log(`hardDrop: Moving from y=${position.y} to y=${newY}`);
    
    if (newY > position.y) {
      // Update both state and ref with the new position
      const newPosition = { ...position, y: newY };
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
      
      // Place the piece immediately
      placePiece();
      
      // No vibration for hard drop
    } else {
      // If we can't move down, just place the piece
      placePiece();
    }
  };
  
  // Place the current piece on the board
  const placePiece = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) {
      console.log('placePiece: No current piece in ref');
      return;
    }
    
    console.log('placePiece: Placing piece on board');
    
    // Create a new board with the current piece placed
    const newBoard = [...board.map(row => [...row])];
    
    // Add the current piece to the board
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    
    // Update the board
    setBoard(newBoard);
    
    // Generate a new piece
    const newPiece = generateRandomPiece();
    console.log('placePiece: Generated new piece');
    
    // Update both state and ref
    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;
    
    // Set the new piece position
    const newPosition = {
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newPiece.shape[0].length / 2),
      y: 0
    };
    
    // Update both state and ref
    setCurrentPosition(newPosition);
    currentPositionRef.current = newPosition;
    
    // Check for completed lines after placing the piece
    const completedLines = checkCompletedLines(newBoard);
    if (completedLines.length > 0) {
      // Remove completed lines
      const updatedBoard = removeCompletedLines(newBoard, completedLines);
      setBoard(updatedBoard);
      
      // Update score
      const linePoints = [0, 40, 100, 300, 1200];
      const points = linePoints[Math.min(completedLines.length, 4)] * (level + 1);
      setScore(prev => prev + points);
      setLinesCleared(prev => prev + completedLines.length);
    }
  };
  
  // Check for completed lines
  const checkCompletedLines = (board: Board): number[] => {
    const completedLines: number[] = [];
    
    // Check each row from bottom to top
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      // Check if the row is full (no empty cells)
      if (board[y].every(cell => cell !== EMPTY_CELL)) {
        completedLines.push(y);
      }
    }
    
    return completedLines;
  };
  
  // Start the game
  const startGame = (initialLevel: number): void => {
    console.log(`Starting game at level ${initialLevel}`);
    
    // Reset game state
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(initialLevel);
    setLinesCleared(0);
    setGameOver(false);
    setIsPaused(false);
    
    // Don't reset the current piece here, as it's already set in the useEffect
    
    // Clear any existing game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Set up the game loop with speed based on level
    const speed = Math.max(800 - (initialLevel * 100), 200); // Speed increases with level
    console.log(`Game speed set to ${speed}ms`);
    
    // Start the game loop
    gameLoopRef.current = setInterval(() => {
      if (!isPaused && !gameOver) {
        console.log('Game loop tick - moving piece down');
        moveDown();
      }
    }, speed);
  };
  
  // Complete the game and return to alarm
  const completeGame = async (success: boolean): Promise<void> => {
    // Clear the timers
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (success) {
      setGameOver(true);
      setShowConfetti(true);
      setShowSuccess(true);
      
      // Vibrate for success
      Vibration.vibrate([0, 50, 30, 80, 30, 100, 30, 150]);
      
      // Animate the success message
      Animated.sequence([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.delay(2000),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        })
      ]).start();
      
      // Track mission completion in AsyncStorage
      try {
        // Get current mission stats
        const statsString = await AsyncStorage.getItem('missionStats');
        let stats = statsString ? JSON.parse(statsString) : {
          wordle: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
          math: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
          typing: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
          photo: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
          qr: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
          tetris: { completed: 0, streak: 0, bestStreak: 0, lastCompleted: null },
        };
        
        // Update Tetris stats
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Check if this is a consecutive day
        const isConsecutiveDay = 
          stats.tetris.lastCompleted === 
          new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday
        
        stats.tetris.completed += 1;
        
        if (isConsecutiveDay) {
          stats.tetris.streak += 1;
        } else {
          stats.tetris.streak = 1;
        }
        
        // Update best streak if current streak is better
        if (stats.tetris.streak > stats.tetris.bestStreak) {
          stats.tetris.bestStreak = stats.tetris.streak;
        }
        
        stats.tetris.lastCompleted = today;
        
        // Save updated stats
        await AsyncStorage.setItem('missionStats', JSON.stringify(stats));
        
        // Add XP for completing the mission
        const xpString = await AsyncStorage.getItem('userXP');
        const levelString = await AsyncStorage.getItem('userLevel');
        
        let xp = xpString ? parseInt(xpString) : 0;
        const userLevel = levelString ? parseInt(levelString) : 1;
        
        // Add 50 XP for completing Tetris
        xp += 50;
        
        // Save updated XP
        await AsyncStorage.setItem('userXP', xp.toString());
        
        // Navigate to trophies page after a short delay
        setTimeout(() => {
          router.replace({
            pathname: '/(tabs)/trophies',
            params: { 
              showAnimation: 'true',
              missionType: 'tetris'
            }
          });
        }, 2000);
        
      } catch (error) {
        console.error('Error updating mission stats:', error);
      }
    } else {
      // If mission failed, just go back to alarm
      router.replace({
        pathname: '/alarm-ring',
        params: { alarmId: params.alarmId }
      });
    }
  };
  
  // Initialize the game
  useEffect(() => {
    // Load tetris settings
    const loadSettings = async () => {
      try {
        // Set a much lower target score regardless of difficulty
        setTargetScore(200); // Very easy to achieve
        
        // Create a new piece immediately
        const firstPiece = generateRandomPiece();
        console.log("Generated first piece:", firstPiece);
        
        // Set both state and ref
        setCurrentPiece(firstPiece);
        currentPieceRef.current = firstPiece;
        
        // Position the piece at the top center of the board
        const initialPosition = {
          x: Math.floor(BOARD_WIDTH / 2) - Math.floor(firstPiece.shape[0].length / 2),
          y: 0
        };
        
        // Set both state and ref
        setCurrentPosition(initialPosition);
        currentPositionRef.current = initialPosition;
        
        // Start the game with level 1
        setTimeout(() => {
          startGame(1);
        }, 500);
        
      } catch (error) {
        console.error('Error loading tetris settings:', error);
        setTargetScore(200);
        // Rest of the error handling...
      }
    };
    
    loadSettings();
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Show alert and then return to alarm
          Alert.alert('Time\'s Up!', 'You ran out of time.', [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to alarm
                router.replace({
                  pathname: '/alarm-ring',
                  params: { alarmId: params.alarmId }
                });
              } 
            }
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Add the interval time in milliseconds
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Render the game board
  const renderBoard = () => {
    // Create a copy of the board
    const boardWithCurrentPiece = board.map(row => [...row]);
    
    // Add the current piece to the board
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPosition.y + y;
            const boardX = currentPosition.x + x;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              boardWithCurrentPiece[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    
    return (
      <View style={styles.board}>
        {boardWithCurrentPiece.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, cellIndex) => (
              <View 
                key={`cell-${rowIndex}-${cellIndex}`} 
                style={[
                  styles.cell,
                  cell !== EMPTY_CELL ? { backgroundColor: cell } : null
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    );
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
        {/* Success message */}
        {showSuccess && (
          <Animated.View style={[styles.successContainer, { opacity: successOpacity }]}>
            <Text style={styles.successText}>MISSION COMPLETE!</Text>
          </Animated.View>
        )}
        
        {/* Confetti cannon */}
        {showConfetti && (
          <ConfettiCannon
            count={200}
            origin={{x: screenWidth/2, y: 0}}
            explosionSpeed={350}
            fallSpeed={3000}
            colors={['#00FFFF', '#800080', '#FFFF00', '#00FF00', '#FF0000', '#0000FF', '#FFA500']}
          />
        )}
        
        {/* Game info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Score</Text>
            <Text style={styles.infoValue}>{score}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Level</Text>
            <Text style={styles.infoValue}>{level}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Lines</Text>
            <Text style={styles.infoValue}>{linesCleared}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
        
        {/* Game board */}
        {renderBoard()}
        
        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={moveLeft}>
              <Ionicons name="arrow-back" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={hardDrop}>
              <Ionicons name="arrow-down" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={moveRight}>
              <Ionicons name="arrow-forward" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={rotate}>
              <Ionicons name="refresh" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const cellSize = Math.min(screenWidth / (BOARD_WIDTH + 2), dimensions.height / (BOARD_HEIGHT + 10));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 20,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    color: '#999',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  board: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: cellSize,
    height: cellSize,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  controls: {
    width: '100%',
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  successText: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
}); 