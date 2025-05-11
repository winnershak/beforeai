// @ts-ignore - Using global firebase
const firebase = global.firebaseApp || require('@react-native-firebase/app').default;
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from './RevenueCatService';

console.log('FirebaseService: Module loading...');

class FirebaseService {
  constructor() {
    console.log('FirebaseService: Constructor called');
  }

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
      console.log('FirebaseService: Starting Google sign-in with token');
      
      // Use auth.GoogleAuthProvider directly
      const { GoogleAuthProvider } = auth;
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
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
      // Use auth.OAuthProvider directly
      const { OAuthProvider } = auth;
      const appleProvider = new OAuthProvider('apple.com');
      
      // Pass the token directly, not as an object
      const credential = appleProvider.credential(identityToken);
      
      const userCredential = await auth().signInWithCredential(credential);
      await this.handleSuccessfulLogin(userCredential.user);
      return true;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      return false;
    }
  }

  // Handle successful login
  async handleSuccessfulLogin(user: any) {
    try {
      console.log(`FirebaseService: Handling successful login for user ${user.uid}`);
      
      // Save user data to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      // Log detailed user information
      console.log('USER DETAILS:', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Not set',
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        metadata: user.metadata,
        providerData: user.providerData,
        providerId: user.providerData?.[0]?.providerId || 'unknown'
      }, null, 2));
      
      // Get the user's email address
      const email = user.email;
      
      // Only proceed if we have an email
      if (email) {
        console.log(`FirebaseService: Identifying user by email: ${email}`);
        
        // Use EMAIL instead of UID to identify with RevenueCat
        await RevenueCatService.identifyUser(email);
        
        // Check premium status
        try {
          console.log('FirebaseService: Checking RevenueCat premium status');
          const hasPremium = await RevenueCatService.isSubscribed();
          console.log(`FirebaseService: User has premium: ${hasPremium}`);
          await AsyncStorage.setItem('isPremium', hasPremium ? 'true' : 'false');
        } catch (premiumError) {
          console.error('FirebaseService: Error checking premium status', premiumError);
          await AsyncStorage.setItem('isPremium', 'false');
        }
      } else {
        console.log('FirebaseService: No email available for RevenueCat identification');
        await AsyncStorage.setItem('isPremium', 'false');
      }
      
      return true;
    } catch (error) {
      console.error('FirebaseService: Error handling login', error);
      return false;
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