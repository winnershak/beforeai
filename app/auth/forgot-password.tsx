// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   ActivityIndicator,
//   ImageBackground,
//   Platform,
//   Alert,
//   KeyboardAvoidingView,
//   ScrollView
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Stack, router } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import auth from '@react-native-firebase/auth';

// export default function ForgotPasswordScreen() {
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [resetSent, setResetSent] = useState(false);
  
//   const handleResetPassword = async () => {
//     if (!email) {
//       Alert.alert('Missing Information', 'Please enter your email address.');
//       return;
//     }
    
//     setLoading(true);
//     try {
//       await auth().sendPasswordResetEmail(email);
//       setResetSent(true);
//     } catch (error) {
//       console.error('Password reset error:', error);
//       Alert.alert('Reset Error', 'An error occurred. Please check your email and try again.');
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   const backgroundImage = require('../../assets/images/10.png');
  
//   return (
//     <>
//       <Stack.Screen options={{ headerShown: false }} />
//       <ImageBackground 
//         source={backgroundImage}
//         style={styles.backgroundImage}
//       >
//         <View style={styles.overlay}>
//           <SafeAreaView style={styles.container}>
//             <KeyboardAvoidingView
//               behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//               style={styles.keyboardAvoid}
//             >
//               <ScrollView contentContainerStyle={styles.scrollContent}>
//                 <TouchableOpacity 
//                   style={styles.backButton}
//                   onPress={() => router.back()}
//                 >
//                   <Ionicons name="arrow-back" size={24} color="#fff" />
//                 </TouchableOpacity>
                
//                 <View style={styles.headerSection}>
//                   <Text style={styles.title}>Reset Password</Text>
//                   <Text style={styles.subtitle}>
//                     Enter your email address and we'll send you a link to reset your password
//                   </Text>
//                 </View>
                
//                 {resetSent ? (
//                   <View style={styles.successContainer}>
//                     <Ionicons name="checkmark-circle" size={60} color="#4CD964" />
//                     <Text style={styles.successTitle}>Email Sent!</Text>
//                     <Text style={styles.successText}>
//                       Check your email for a link to reset your password.
//                     </Text>
//                     <TouchableOpacity 
//                       style={styles.backToLoginButton}
//                       onPress={() => router.push('/auth/login')}
//                     >
//                       <Text style={styles.backToLoginText}>Back to Login</Text>
//                     </TouchableOpacity>
//                   </View>
//                 ) : (
//                   <View style={styles.formSection}>
//                     <View style={styles.inputContainer}>
//                       <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
//                       <TextInput
//                         style={styles.input}
//                         placeholder="Email"
//                         placeholderTextColor="#999"
//                         value={email}
//                         onChangeText={setEmail}
//                         autoCapitalize="none"
//                         keyboardType="email-address"
//                       />
//                     </View>
                    
//                     <TouchableOpacity 
//                       style={styles.resetButton}
//                       onPress={handleResetPassword}
//                       disabled={loading}
//                     >
//                       {loading ? (
//                         <ActivityIndicator color="#fff" />
//                       ) : (
//                         <Text style={styles.resetButtonText}>Send Reset Link</Text>
//                       )}
//                     </TouchableOpacity>
//                   </View>
//                 )}
//               </ScrollView>
//             </KeyboardAvoidingView>
//           </SafeAreaView>
//         </View>
//       </ImageBackground>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   backgroundImage: {
//     flex: 1,
//     width: '100%',
//     height: '100%',
//   },
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//   },
//   container: {
//     flex: 1,
//   },
//   keyboardAvoid: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     padding: 20,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   headerSection: {
//     marginBottom: 40,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#ccc',
//     lineHeight: 22,
//   },
//   formSection: {
//     marginBottom: 30,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 12,
//     marginBottom: 16,
//     paddingHorizontal: 15,
//     height: 55,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//   },
//   inputIcon: {
//     marginRight: 10,
//   },
//   input: {
//     flex: 1,
//     color: '#fff',
//     fontSize: 16,
//     height: '100%',
//   },
//   resetButton: {
//     backgroundColor: '#0A84FF',
//     height: 55,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#0A84FF',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   resetButtonText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   successContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 40,
//   },
//   successTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginTop: 20,
//     marginBottom: 10,
//   },
//   successText: {
//     fontSize: 16,
//     color: '#ccc',
//     textAlign: 'center',
//     marginBottom: 30,
//     lineHeight: 22,
//   },
//   backToLoginButton: {
//     backgroundColor: '#0A84FF',
//     height: 55,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     width: '100%',
//     shadowColor: '#0A84FF',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   backToLoginText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
// }); 