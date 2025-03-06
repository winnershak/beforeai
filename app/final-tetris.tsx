import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration, Animated, Alert, GestureResponderEvent, Pressable } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

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
  return Array(BOARD_HEIGHT).fill(null).map(() => 
    Array(BOARD_WIDTH).fill(EMPTY_CELL)
  );
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
  
  // Touch handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const linesClearedRef = useRef<number>(0);
  
  // Improve tap detection by adding a tap threshold and timer
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const tapMovementRef = useRef<{x: number, y: number} | null>(null);
  
  // Add sound references
  const [tetrisMusic, setTetrisMusic] = useState<Audio.Sound | null>(null);
  const [moveSound, setMoveSound] = useState<Audio.Sound | null>(null);
  const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
  
  // Check if a move is valid
  const isValidMove = (shape: number[][], x: number, y: number): boolean => {
    if (!shape) return false;
    
    // Check each cell of the piece
    for (let pieceY = 0; pieceY < shape.length; pieceY++) {
      for (let pieceX = 0; pieceX < shape[pieceY].length; pieceX++) {
        // Skip empty cells in the piece shape
        if (shape[pieceY][pieceX] !== 1) continue;
        
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
        
        // Check if the position is already occupied (but only if it's on the board)
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
    
    if (!piece || gameOver) {
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
      // Use requestAnimationFrame to ensure UI is updated first
      requestAnimationFrame(() => {
        placePiece();
      });
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
    
    if (!piece || gameOver) return;
    
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
    
    // Try wall kicks - try to move the piece left or right if it can't rotate in place
    // Try moving left
    if (isValidMove(rotatedShape, position.x - 1, position.y)) {
      const newPiece = { ...piece, shape: rotatedShape };
      const newPosition = { ...position, x: position.x - 1 };
      
      setCurrentPiece(newPiece);
      setCurrentPosition(newPosition);
      currentPieceRef.current = newPiece;
      currentPositionRef.current = newPosition;
      return;
    }
    
    // Try moving right
    if (isValidMove(rotatedShape, position.x + 1, position.y)) {
      const newPiece = { ...piece, shape: rotatedShape };
      const newPosition = { ...position, x: position.x + 1 };
      
      setCurrentPiece(newPiece);
      setCurrentPosition(newPosition);
      currentPieceRef.current = newPiece;
      currentPositionRef.current = newPosition;
      return;
    }
    
    // If rotation fails, don't allow it
    console.log('Rotation blocked - would cause collision');
  };
  
  // Drop the piece all the way down
  const hardDrop = (): void => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece || gameOver) return;
    
    console.log('hardDrop: Starting hard drop');
    
    // Find the lowest valid position
    let newY = position.y;
    
    // Keep moving down until we hit something
    while (isValidMove(piece.shape, position.x, newY + 1)) {
      newY++;
    }
    
    console.log(`hardDrop: Moving from y=${position.y} to y=${newY}`);
    
    // Only update if we actually moved
    if (newY > position.y) {
      // Update both state and ref
      const newPosition = { ...position, y: newY };
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
    }
    
    // Place the piece immediately after dropping
    // Use a more reliable approach to ensure the piece is placed
    requestAnimationFrame(() => {
      placePiece();
    });
  };
  
  // Place the current piece on the board
  const placePiece = () => {
    console.log('placePiece: Placing piece on board');
    
    if (!currentPieceRef.current || gameOver) return;
    
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    // Create a deep copy of the board
    const newBoard = board.map(row => [...row]);
    
    // Add the piece to the board
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] === 1) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          
          // Make sure we're within bounds
          if (
            boardY >= 0 && 
            boardY < BOARD_HEIGHT && 
            boardX >= 0 && 
            boardX < BOARD_WIDTH
          ) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    
    // Update the board
    setBoard(newBoard);
    
    // Check for completed lines
    const completedLines: number[] = [];
    
    // Check each row from bottom to top
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== EMPTY_CELL)) {
        completedLines.push(y);
      }
    }
    
    // If we have completed lines
    if (completedLines.length > 0) {
      // Update the lines cleared count
      setLinesCleared(prev => prev + completedLines.length);
      linesClearedRef.current += completedLines.length;
      
      // Remove the completed lines
      const updatedBoard = [...newBoard];
      
      // Remove lines from bottom to top
      completedLines.sort((a, b) => b - a).forEach(rowIndex => {
        updatedBoard.splice(rowIndex, 1);
        // Add a new empty row at the top
        updatedBoard.unshift(Array(BOARD_WIDTH).fill(EMPTY_CELL));
      });
      
      // Update the board
      setBoard(updatedBoard);
      
      // Update score
      setScore(prev => prev + (completedLines.length * 100 * level));
      
      // Check win condition
      checkWinCondition();
      
      // Return early - don't generate a new piece if we've won
      if (gameOver) {
        return;
      }
    }
    
    // Generate a new piece
    const newPiece = generateRandomPiece();
    console.log('placePiece: Generated new piece');
    
    // Set the new piece at the top center
    const newPosition = { 
      x: Math.floor((BOARD_WIDTH - newPiece.shape[0].length) / 2), 
      y: 0 
    };
    
    // Check if the game is over (can't place the new piece)
    if (!isValidMove(newPiece.shape, newPosition.x, newPosition.y)) {
      console.log('Game over - cannot place new piece');
      setGameOver(true);
      
      // If we didn't clear any lines, go back to alarm
      if (linesClearedRef.current === 0) {
        // Navigate back to alarm ring after a short delay
        setTimeout(() => {
          router.replace({
            pathname: '/alarm-ring',
            params: { alarmId: params.alarmId }
          });
        }, 1000);
      }
      
      return;
    }
    
    // Update both state and ref
    setCurrentPiece(newPiece);
    setCurrentPosition(newPosition);
    currentPieceRef.current = newPiece;
    currentPositionRef.current = newPosition;
  };
  
  // Check for completed lines
  const checkCompletedLines = (board: Board): number[] => {
    const completedLines: number[] = [];
    
    // Check each row from bottom to top
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      // If every cell in this row is filled
      if (board[y].every(cell => cell !== EMPTY_CELL)) {
        completedLines.push(y);
      }
    }
    
    return completedLines;
  };
  
  // Start the game
  const startGame = (initialLevel: number) => {
    console.log('Starting game at level', initialLevel);
    
    // Reset game state
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(initialLevel);
    setLinesCleared(0);
    setGameOver(false);
    setIsPaused(false);
    linesClearedRef.current = 0;
    
    // Slower initial game speed (1000ms instead of 700ms)
    const gameSpeed = 1000 - (initialLevel - 1) * 100;
    console.log('Game speed set to', gameSpeed + 'ms');
    
    // Clear any existing game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    
    // Start the game loop
    gameLoopRef.current = setInterval(() => {
      if (!isPaused && !gameOver) {
        console.log('Game loop tick - moving piece down');
        moveDown();
      }
    }, gameSpeed);
    
    // Start the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      if (!isPaused && !gameOver) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up
            clearInterval(timerRef.current as NodeJS.Timeout);
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
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
        
        // Update mission-specific count
        const missionName = 'Tetris';
        const missionCountKey = `${missionName.toLowerCase()}Count`;
        const missionCount = await AsyncStorage.getItem(missionCountKey);
        const newMissionCount = missionCount ? parseInt(missionCount) + 1 : 1;
        await AsyncStorage.setItem(missionCountKey, newMissionCount.toString());
        
        // Update mission breakdown
        const breakdownJson = await AsyncStorage.getItem('missionBreakdown');
        let breakdown = breakdownJson ? JSON.parse(breakdownJson) : {};
        breakdown[missionName] = newMissionCount;
        await AsyncStorage.setItem('missionBreakdown', JSON.stringify(breakdown));
        
        // Update streak
        const currentDate = new Date().toISOString().split('T')[0]; // Today's date
        const lastCompletionDate = await AsyncStorage.getItem('lastCompletionDate');
        const currentStreak = await AsyncStorage.getItem('currentStreak');
        let newStreak = 1;
        
        if (currentStreak) {
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toISOString().split('T')[0];
          
          if (lastCompletionDate === yesterday) {
            // Completed yesterday, increment streak
            newStreak = parseInt(currentStreak) + 1;
          } else if (lastCompletionDate === currentDate) {
            // Already completed today, maintain streak
            newStreak = parseInt(currentStreak);
          }
        }
        
        await AsyncStorage.setItem('currentStreak', newStreak.toString());
        await AsyncStorage.setItem('lastCompletionDate', currentDate);
        
        console.log(`Updated stats for ${missionName}: count=${newMissionCount}, streak=${newStreak}`);
        
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
    // Initialize the game
    const initialBoard = createEmptyBoard();
    setBoard(initialBoard);
    
    // Set the initial level based on the score target
    const initialLevel = 1;
    setLevel(initialLevel);
    
    // Generate the first piece
    const firstPiece = generateRandomPiece();
    setCurrentPiece(firstPiece);
    currentPieceRef.current = firstPiece;
    
    // Position the piece at the top center of the board
    const initialPosition = {
      x: Math.floor((BOARD_WIDTH - firstPiece.shape[0].length) / 2),
      y: 0
    };
    setCurrentPosition(initialPosition);
    currentPositionRef.current = initialPosition;
    
    // Start the game
    startGame(initialLevel);
    
    // Load sounds when component mounts
    const loadSounds = async () => {
      try {
        console.log('Loading Tetris sounds...');
        
        // Load tetris background music
        const { sound: musicSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/tetris.caf'),
          { isLooping: true, volume: 0.5 }
        );
        setTetrisMusic(musicSound);
        
        // Load piece movement sound
        const { sound: sliceSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/slice.caf'),
          { volume: 0.7 }
        );
        setMoveSound(sliceSound);
        
        // Load completion sound
        const { sound: wordSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/completeword.caf'),
          { volume: 1.0 }
        );
        setCompleteSound(wordSound);
        
        console.log('Tetris sounds loaded successfully');
      } catch (error) {
        console.error('Error loading sounds:', error);
      }
    };
    
    loadSounds();
    
    // Start playing music when game starts
    return () => {
      // Clean up sounds when component unmounts
      if (tetrisMusic) {
        tetrisMusic.stopAsync();
        tetrisMusic.unloadAsync();
      }
      if (moveSound) {
        moveSound.unloadAsync();
      }
      if (completeSound) {
        completeSound.unloadAsync();
      }
    };
  }, []);
  
  // Start playing music when game starts
  useEffect(() => {
    if (tetrisMusic && !gameOver) {
      tetrisMusic.playAsync();
    }
    return () => {
      if (tetrisMusic) {
        tetrisMusic.pauseAsync();
      }
    };
  }, [tetrisMusic, gameOver]);
  
  // Play move sound when piece moves down
  const playMoveSound = async () => {
    try {
      if (moveSound) {
        await moveSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing move sound:', error);
    }
  };
  
  // Play completion sound when line is cleared
  const playCompleteSound = async () => {
    try {
      if (completeSound) {
        await completeSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing complete sound:', error);
    }
  };
  
  // Simplify the tap handler to be more reliable
  const handleTap = () => {
    console.log('Tap detected - rotating piece');
    rotate();
  };

  // Add a function to render the ghost piece (preview of where piece will land)
  const getGhostPosition = (): Position => {
    const piece = currentPieceRef.current;
    const position = currentPositionRef.current;
    
    if (!piece) return { x: 0, y: 0 };
    
    // Find the lowest valid position
    let ghostY = position.y;
    
    // Keep moving down until we hit something
    while (isValidMove(piece.shape, position.x, ghostY + 1)) {
      ghostY++;
    }
    
    return { x: position.x, y: ghostY };
  };

  // Fix the renderBoard function to show the ghost piece
  const renderBoard = () => {
    // Create a deep copy of the board for rendering
    const boardWithPieces = board.map(row => [...row]);
    
    // Add the ghost piece to the board first (so it appears behind the current piece)
    if (currentPiece && !gameOver) {
      const ghostPosition = getGhostPosition();
      
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] === 1) {
            const boardY = ghostPosition.y + y;
            const boardX = ghostPosition.x + x;
            
            if (
              boardY >= 0 && 
              boardY < BOARD_HEIGHT && 
              boardX >= 0 && 
              boardX < BOARD_WIDTH &&
              boardWithPieces[boardY][boardX] === EMPTY_CELL
            ) {
              // Use a semi-transparent white for the ghost piece
              boardWithPieces[boardY][boardX] = 'rgba(255, 255, 255, 0.3)';
            }
          }
        }
      }
    }
    
    // Add the current piece to the board (on top of the ghost piece)
    if (currentPiece && !gameOver) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] === 1) {
            const boardY = currentPosition.y + y;
            const boardX = currentPosition.x + x;
            
            if (
              boardY >= 0 && 
              boardY < BOARD_HEIGHT && 
              boardX >= 0 && 
              boardX < BOARD_WIDTH
            ) {
              boardWithPieces[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    
    // Render the board
    return (
      <View style={styles.board}>
        {boardWithPieces.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, cellIndex) => (
              <View 
                key={cellIndex} 
                style={[
                  styles.cell, 
                  { backgroundColor: cell || '#111' }
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };
  
  // Simplify the touch handling to make it more reliable
  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.locationX;
    touchStartY.current = e.nativeEvent.locationY;
    
    // Record the start position and time for tap detection
    tapMovementRef.current = {
      x: e.nativeEvent.locationX,
      y: e.nativeEvent.locationY
    };
    lastTapTimeRef.current = Date.now();
  };

  // Make swipe gestures only control movement (not rotation)
  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const currentX = e.nativeEvent.locationX;
    const currentY = e.nativeEvent.locationY;
    
    // Track total movement for tap detection
    if (tapMovementRef.current) {
      const totalMovementX = Math.abs(currentX - tapMovementRef.current.x);
      const totalMovementY = Math.abs(currentY - tapMovementRef.current.y);
      
      // If movement exceeds threshold, it's not a tap
      if (totalMovementX > 10 || totalMovementY > 10) {
        tapMovementRef.current = null;
      }
    }
    
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;
    
    // Horizontal swipe (left/right)
    if (Math.abs(diffX) > 30) {
      if (diffX > 0) {
        // Swipe right
        moveRight();
      } else {
        // Swipe left
        moveLeft();
      }
      touchStartX.current = currentX;
    }
    
    // Vertical swipe down - perform hard drop
    if (diffY > 40) {
      // Swipe down - hard drop the piece
      hardDrop();
      touchStartY.current = currentY;
    }
    
    // No rotation on swipe up - rotation is only on tap
  };

  // Remove the complex tap detection in touchEnd and use a simpler approach
  const handleTouchEnd = (e: GestureResponderEvent) => {
    // Reset touch tracking
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Fix the checkWinCondition function to properly pass mission completion to trophies
  const checkWinCondition = () => {
    if (linesClearedRef.current > 0) {
      // Win condition: clear just one line
      console.log('Win condition met! Lines cleared:', linesClearedRef.current);
      setGameOver(true);
      
      // Show success animation
      setShowSuccess(true);
      setShowConfetti(true);
      
      // Stop the game loop
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop the alarm
      stopAlarm();
      
      // Animate the success message with a longer duration
      Animated.sequence([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.delay(4000)
      ]).start(() => {
        // Only navigate after the animation completes
        console.log('Animation complete, navigating to trophies');
        
        // Make sure to use the correct case for missionType
        setTimeout(() => {
          router.replace({
            pathname: '/(tabs)/trophies',
            params: { 
              missionCompleted: 'true',
              showAnimation: 'true',  // Make sure this is set to 'true'
              missionType: 'Tetris',  // Use proper capitalization
              score: score.toString()
            }
          });
        }, 1000);
      });
    }
  };
  
  // Update the stopAlarm function to not navigate away immediately
  const stopAlarm = () => {
    // Stop any playing alarm sounds
    try {
      // Just stop the sound without navigating
      console.log('Stopping alarm sound');
      // You can add code here to stop the sound if needed
    } catch (error) {
      console.error('Error stopping alarm:', error);
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
        {/* Success message - simplified to match Wordle */}
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
        
        {/* Game board - centered and properly sized */}
        <View style={styles.gameBoardContainer}>
          <View style={styles.gameBoard}>
            {renderBoard()}
          </View>
        </View>
        
        {/* Button controls */}
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={rotate}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={moveLeft}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={hardDrop}
            >
              <Ionicons name="arrow-down" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={moveRight}
            >
              <Ionicons name="arrow-forward" size={24} color="#fff" />
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
    width: '100%',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    height: `${100 / BOARD_HEIGHT}%`,
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  controls: {
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
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
    marginHorizontal: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
  gameBoardContainer: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameBoard: {
    aspectRatio: BOARD_WIDTH / BOARD_HEIGHT,
    height: '100%',
    maxWidth: '100%',
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  instructions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  instructionText: {
    color: '#999',
    fontSize: 14,
    marginVertical: 5,
    textAlign: 'center',
  },
}); 