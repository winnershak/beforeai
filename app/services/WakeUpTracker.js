import { saveWakeupToFirestore, getCurrentUser } from '../config/firebase';

export const recordWakeUp = async (alarmData, customMessage = '') => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log('📊 User not signed in, skipping tracking');
      return;
    }

    const wakeUpRecord = {
      // Basic data
      wakeUpTime: new Date().toISOString(),
      targetTime: alarmData.time,
      actualTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      
      // User message/flex text
      message: customMessage || `Crushed my ${alarmData.time} alarm! 💪`,
      
      // Stats for website display
      soundUsed: alarmData.sound,
      consistency: await calculateConsistency(user.uid),
      
      // User info for website
      userId: user.uid,
      userEmail: user.email,
      userSlug: user.email?.split('@')[0] || user.uid.substring(0, 8), // For URL like: yoursite.com/sleep/john
    };

    await saveWakeupToFirestore(wakeUpRecord);
    console.log('✅ Wake-up saved for personal page!');
    
    return wakeUpRecord;
  } catch (error) {
    console.error('❌ Error saving wake-up:', error);
  }
};

const calculateConsistency = async (userId) => {
  // Simple 7-day consistency score
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const snapshot = await firestore()
      .collection('wakeups')
      .where('userId', '==', userId)
      .where('createdAt', '>=', oneWeekAgo)
      .get();
    
    return {
      wakeUpsThisWeek: snapshot.size,
      consistencyScore: Math.min(100, (snapshot.size / 7) * 100) // Max 100%
    };
  } catch (error) {
    return { wakeUpsThisWeek: 1, consistencyScore: 100 };
  }
}; 