import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function PremiumModal({ 
  visible, 
  onClose, 
  title = "Premium Feature", 
  message 
}: PremiumModalProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.normalText}>Maybe Later</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                onClose();
                router.push('/quiz/yes');
              }}
            >
              <Text style={styles.boldText}>Upgrade</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    width: 270,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#48484A',
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  primaryButton: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#48484A',
  },
  normalText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: 'normal',
  },
  boldText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',
  },
}); 