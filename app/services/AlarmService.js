// Play alarm sound
export async function playAlarmSound(alarmId) {
  try {
    // Check if alarm ID is valid
    if (!alarmId) {
      console.error('Invalid alarm ID:', alarmId);
      return null;
    }
    
    // Get the alarm from storage
    const alarms = await getAlarms();
    const alarm = alarms.find(a => a.id === alarmId);
    
    if (!alarm) {
      console.error('Alarm not found with ID:', alarmId);
      return null;
    }
    
    // Get sound preference from alarm or use default
    const soundName = alarm.sound || 'radar';
    let soundSource;
    
    // Map sound names to their file paths
    switch (soundName) {
      case 'beacon':
        soundSource = require('../../assets/sounds/beacon.caf');
        break;
      case 'chimes':
        soundSource = require('../../assets/sounds/chimes.caf');
        break;
      // ... other cases
      default:
        soundSource = require('../../assets/sounds/radar.caf');
        break;
    }
    
    // Play the sound
    const { sound } = await Audio.Sound.createAsync(
      soundSource,
      { shouldPlay: true, isLooping: true }
    );
    
    // Store sound reference
    global.alarmSound = sound;
    return sound;
  } catch (error) {
    console.error('Error playing alarm sound:', error);
    return null;
  }
}

export default {}; 