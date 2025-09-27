import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWakeUpDate: string;
  totalEarlyWakeUps: number;
}

export class StreakService {
  
  // Update streak when user wakes up BEFORE 8 AM
  static async updateWakeUpStreak(wakeUpTime: string): Promise<StreakData> {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Parse wake-up time (format: "6:30" or "6:30:00")
      const [hours, minutes] = wakeUpTime.split(':').map(Number);
      
      // Only count as streak if before 8 AM
      const isEarlyWakeUp = hours < 8;
      
      if (!isEarlyWakeUp) {
        console.log('Wake-up after 8 AM - not counting for streak');
        return await this.getStreakData();
      }
      
      // Get existing streak data
      const streakData = await this.getStreakData();
      
      // Check if already recorded today
      if (streakData.lastWakeUpDate === todayString) {
        console.log('Early wake-up already recorded for today');
        return streakData;
      }
      
      let newCurrentStreak = 1;
      
      if (streakData.lastWakeUpDate) {
        const lastDate = new Date(streakData.lastWakeUpDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Consecutive day - increment streak
          newCurrentStreak = streakData.currentStreak + 1;
        } else {
          // Streak broken - reset to 1
          newCurrentStreak = 1;
        }
      }
      
      // Update longest streak if needed
      const newLongestStreak = Math.max(streakData.longestStreak, newCurrentStreak);
      
      const updatedData: StreakData = {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastWakeUpDate: todayString,
        totalEarlyWakeUps: streakData.totalEarlyWakeUps + 1
      };
      
      // Save to storage
      await AsyncStorage.setItem('earlyWakeUpStreak', JSON.stringify(updatedData));
      
      console.log(`🔥 Early wake-up streak: ${newCurrentStreak} days (woke up at ${wakeUpTime})`);
      return updatedData;
      
    } catch (error) {
      console.error('Error updating wake-up streak:', error);
      return await this.getStreakData();
    }
  }
  
  // Get current streak data
  static async getStreakData(): Promise<StreakData> {
    try {
      const data = await AsyncStorage.getItem('earlyWakeUpStreak');
      if (data) {
        return JSON.parse(data);
      }
      
      // Default data
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWakeUpDate: '',
        totalEarlyWakeUps: 0
      };
    } catch (error) {
      console.error('Error getting streak data:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWakeUpDate: '',
        totalEarlyWakeUps: 0
      };
    }
  }
  
  // Generate shareable message
  static getStreakShareMessage(streakData: StreakData, wakeUpTime: string): string {
    const { currentStreak } = streakData;
    
    if (currentStreak === 1) {
      return `${wakeUpTime} wake-up! Starting my early bird streak 🌅`;
    } else if (currentStreak < 7) {
      return `${wakeUpTime} wake-up • ${currentStreak} day streak! 🔥`;
    } else if (currentStreak < 30) {
      return `${wakeUpTime} wake-up • ${currentStreak}-day streak! On fire! 🔥`;
    } else {
      return `${wakeUpTime} wake-up • ${currentStreak} days strong! Unstoppable! 💪`;
    }
  }
}
