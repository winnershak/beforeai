import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In with EXACT settings
GoogleSignin.configure({
  webClientId: '748781286916-o2egm2al46ak0bnnbkkir01ck9qafael.apps.googleusercontent.com',
  offlineAccess: false,
  hostedDomain: '',
  forceCodeForRefreshToken: false,
});

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase...');
    const result = await auth().signInAnonymously();
    console.log('🔥 Firebase works! User:', result.user.uid);
    await auth().signOut(); // Clean up anonymous session
    return result;
  } catch (error) {
    console.error('🔥 Firebase test failed:', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    console.log('🔥 Starting Google Sign-In process...');
    
    // Step 1: Sign out completely first
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
    } catch (e) {
      console.log('No existing session to clear');
    }
    
    // Step 2: Check Play Services
    console.log('🔥 Checking Play Services...');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Step 3: Get Google user info
    console.log('🔥 Getting Google user...');
    const userInfo = await GoogleSignin.signIn();
    console.log('🔥 Google user info:', userInfo);
    
    // Step 4: FIX - Check for idToken in the right location!
    const idToken = userInfo.data?.idToken || userInfo.idToken;
    console.log('🔥 Looking for idToken...', { 
      hasDataIdToken: !!userInfo.data?.idToken,
      hasDirectIdToken: !!userInfo.idToken,
      foundIdToken: !!idToken 
    });
    
    if (!idToken) {
      console.error('🔥 No idToken found anywhere in userInfo:', JSON.stringify(userInfo, null, 2));
      throw new Error('Google Sign-In failed to return idToken');
    }
    
    console.log('🔥 Got idToken! Creating Firebase credential...');
    
    // Step 5: Create Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    
    // Step 6: Sign in to Firebase
    console.log('🔥 Signing into Firebase...');
    const result = await auth().signInWithCredential(googleCredential);
    
    console.log('🔥 SUCCESS! Firebase user:', result.user.email || result.user.uid);
    return result;
    
  } catch (error) {
    console.error('🔥 Google Sign-In Error Details:', {
      code: error.code,
      message: error.message,
      nativeErrorMessage: error.nativeErrorMessage,
      userInfo: error.userInfo,
    });
    
    // Better error messages
    if (error.code === '12501' || error.code === 'sign_in_cancelled') {
      throw new Error('Sign-in was cancelled');
    } else if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
      throw new Error('Google Sign-In configuration error. Check Firebase setup.');
    } else if (error.code === '7' || error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Check your internet connection.');
    } else if (error.message?.includes('idToken')) {
      throw new Error('Failed to get authentication token from Google. Try again.');
    } else {
      throw new Error(`Sign-in failed: ${error.message || 'Unknown error'}`);
    }
  }
};

export const signOut = async () => {
  try {
    await auth().signOut();
    await GoogleSignin.signOut();
    console.log('🔥 Successfully signed out');
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
};

export const getCurrentUser = () => auth().currentUser;

export const saveWakeupToFirestore = async (wakeupData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // ✅ Only save the essential fields
    const cleanData = {
      wakeUpTime: wakeupData.wakeUpTime,
      date: wakeupData.date,
      message: wakeupData.message || '', // Default to empty string
      userId: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('wakeups')
      .add(cleanData);
    
    console.log('✅ Wakeup data saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving wakeup:', error);
    throw error;
  }
};

// Simple email/password auth (MUCH easier!)
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    console.log('🔥 Creating account...');
    const result = await auth().createUserWithEmailAndPassword(email, password);
    
    if (displayName) {
      await result.user.updateProfile({ displayName });
    }
    
    console.log('🔥 SUCCESS! Account created:', result.user.email);
    return result;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered. Try signing in.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password too weak. Use 6+ characters.');
    } else {
      throw new Error(`Sign-up failed: ${error.message}`);
    }
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    console.log('🔥 Signing in...');
    const result = await auth().signInWithEmailAndPassword(email, password);
    console.log('🔥 SUCCESS! Signed in:', result.user.email);
    return result;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found. Try signing up first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password.');
    } else {
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }
};

export const addTestWakeUp = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log('User not signed in');
      return;
    }

    // ✅ Simple test data
    const testWakeUp = {
      wakeUpTime: '07:30',
      date: new Date().toISOString().split('T')[0],
      message: 'Good morning! 🌅',
    };

    await saveWakeupToFirestore(testWakeUp);
    console.log('✅ Test wake-up added to Firebase!');
  } catch (error) {
    console.error('Error adding test wake-up:', error);
  }
};

export const checkUsernameAvailable = async (username) => {
  try {
    const snapshot = await firestore()
      .collection('profiles')
      .where('username', '==', username.toLowerCase())
      .get();
    
    return snapshot.empty; // true if available
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Filter out undefined/null/empty values
    const cleanData = {};
    Object.keys(profileData).forEach(key => {
      const value = profileData[key];
      if (value !== undefined && value !== null && value !== '') {
        cleanData[key] = value;
      }
    });

    // Only proceed if we have clean data
    if (Object.keys(cleanData).length === 0) {
      return; // Nothing to update
    }

    // Check username availability if username is being updated
    if (cleanData.username) {
      const isAvailable = await checkUsernameAvailable(cleanData.username);
      if (!isAvailable) {
        throw new Error('Username already taken');
      }
    }

    // Update the profile document
    await firestore()
      .collection('profiles')
      .doc(user.uid)
      .set({
        ...cleanData,
        userId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    console.log('✅ Profile updated'); // Keep this one success log
  } catch (error) {
    // Don't log errors, just throw them to be handled by caller
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const doc = await firestore()
      .collection('profiles')
      .doc(userId)
      .get();
    
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
};

export { auth, firestore }; 