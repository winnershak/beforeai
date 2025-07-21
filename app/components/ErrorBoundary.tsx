import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('🚨 ErrorBoundary caught error:', error.message);
    
    // Store error for debugging
    this.storeError(error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  storeError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('lastCrashError', JSON.stringify(errorData));
    } catch {
      // Ignore storage errors
    }
  };

  restart = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#000',
          padding: 20 
        }}>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>
            ⚠️ Something went wrong
          </Text>
          <Text style={{ color: '#888', fontSize: 14, marginBottom: 30, textAlign: 'center' }}>
            The app encountered an error but didn't crash completely.
          </Text>
          
          <TouchableOpacity 
            onPress={this.restart}
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              marginBottom: 10
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>🔄 Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                'Error Details', 
                this.state.error?.message || 'Unknown error'
              );
            }}
            style={{
              backgroundColor: '#333',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>📋 Show Details</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 