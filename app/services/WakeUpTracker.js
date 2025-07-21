// import { saveWakeupToFirestore, getCurrentUser } from '../config/firebase';

export const recordWakeUp = async (alarmData, customMessage = '') => {
  try {
    // const user = getCurrentUser();
    // if (!user) {
    //   console.log('📊 User not signed in, skipping tracking');
    //   return;
    // }

    // Just log locally instead of saving to Firebase
    console.log('📊 Wake-up recorded locally:', {
      time: new Date().toLocaleTimeString(),
      targetTime: alarmData.time,
      message: customMessage
    });
    
    // ... rest of function should also be commented out or simplified
  } catch (error) {
    console.error('❌ Error saving wake-up:', error);
  }
};

const calculateConsistency = async (userId) => {
  // Simple 7-day consistency score
  try {
    // const oneWeekAgo = new Date();
    // oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // const snapshot = await firestore()
    //   .collection('wakeups') 
    //   .where('userId', '==', userId)
    //   .where('createdAt', '>=', oneWeekAgo)
    //   .get();
    
    // Just use default value since Firebase is disabled
    wakeUpRecord.consistency = { wakeUpsThisWeek: 1 };
  } catch (error) {
    return { wakeUpsThisWeek: 1, consistencyScore: 100 };
  }
}; 