export const scheduleAlarmNotificationUtil = async (alarm: any) => {
  try {
    // Check if time is defined
    if (!alarm || !alarm.time) {
      console.error('Cannot schedule notification: alarm or alarm.time is undefined', alarm);
      return;
    }
    
    // Now we can safely split the time
    const [hours, minutes] = alarm.time.split(':');
    
    // Rest of the function...
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
};

export default {}; 