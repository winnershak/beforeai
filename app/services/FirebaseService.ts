import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from './RevenueCatService';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

class FirebaseService {
  // Listen for auth state changes
  subscribeToAuthChanges(callback: (user: any | null) => void) {
    return auth().onAuthStateChanged(callback);
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      await this.handleSuccessfulLogin(userCredential.user);
      return true;
    } catch (error) {
      console.error('Email sign-in error:', error);
      return false;
    }
  }

  // Sign up with email and password
  async signUpWithEmail(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      await this.handleSuccessfulLogin(userCredential.user);
      return true;
    } catch (error) {
      console.error('Email sign-up error:', error);
      return false;
    }
  }

  // Sign in with Google
  async signInWithGoogle(idToken: string): Promise<boolean> {
    try {
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      await this.handleSuccessfulLogin(userCredential.user);
      return true;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return false;
    }
  }

  // Sign in with Apple
  async signInWithApple(identityToken: string): Promise<boolean> {
    try {
      const appleCredential = auth.AppleAuthProvider.credential(identityToken);
      const userCredential = await auth().signInWithCredential(appleCredential);
      await this.handleSuccessfulLogin(userCredential.user);
      return true;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      return false;
    }
  }

  // Handle successful login
  async handleSuccessfulLogin(user: any) {
    // Store user data in AsyncStorage
    await AsyncStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }));
    await AsyncStorage.setItem('isLoggedIn', 'true');
    
    // Identify user in RevenueCat
    if (user.uid) {
      await RevenueCatService.identify(user.uid);
    }
  }

  // Sign out
  async signOut(): Promise<boolean> {
    try {
      await auth().signOut();
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isLoggedIn');
      return true;
    } catch (error) {
      console.error('Sign-out error:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser(): any | null {
    return auth().currentUser;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return auth().currentUser !== null;
  }
}

export default new FirebaseService(); 