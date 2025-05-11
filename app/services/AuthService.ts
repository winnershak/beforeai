import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import FirebaseService from './FirebaseService';

// Register for web redirect
WebBrowser.maybeCompleteAuthSession();

// Your web API base URL
const API_BASE_URL = 'https://your-api-url.com';

class AuthService {
  // Google Auth configuration
  private googleConfig = {
    iosClientId: '748781286916-9pj4l0k1di57hoh672q2hluug5vu4msj.apps.googleusercontent.com',
    androidClientId: '748781286916-9pj4l0k1di57hoh672q2hluug5vu4msj.apps.googleusercontent.com',
    webClientId: '748781286916-9pj4l0k1di57hoh672q2hluug5vu4msj.apps.googleusercontent.com',
  };

  // Initialize Google Auth
  initGoogleAuth() {
    return Google.useAuthRequest({
      clientId: Platform.OS === 'ios' 
        ? this.googleConfig.iosClientId 
        : this.googleConfig.androidClientId,
      scopes: ['profile', 'email']
    });
  }

  // Sign in with Google
  async signInWithGoogle(accessToken: string): Promise<boolean> {
    try {
      console.log('AuthService: Starting Google sign-in with access token');
      
      // Create a Google credential with the access token
      const googleCredential = auth.GoogleAuthProvider.credential(null, accessToken);
      
      // Sign in with credential directly
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      // Handle successful login
      if (userCredential.user) {
        await FirebaseService.handleSuccessfulLogin(userCredential.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthService: Google sign-in error:', error);
      return false;
    }
  }

  // Sign in with Apple
  async signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Sign in with Firebase
      return await FirebaseService.signInWithApple(credential.identityToken || '');
    } catch (error) {
      console.error('Apple sign-in error:', error);
      return false;
    }
  }

  // Sign in with email
  async signInWithEmail(email: string, password: string): Promise<boolean> {
    return await FirebaseService.signInWithEmail(email, password);
  }

  // Sign up with email
  async signUpWithEmail(email: string, password: string): Promise<boolean> {
    return await FirebaseService.signUpWithEmail(email, password);
  }

  // Check if user is logged in
  async isLoggedIn() {
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
    return isLoggedIn === 'true';
  }

  // Get current user
  async getCurrentUser() {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Sign out
  async signOut(): Promise<boolean> {
    return await FirebaseService.signOut();
  }
}

export default new AuthService(); 