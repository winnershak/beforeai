import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  Dimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

export default function GroupPlanScreen() {
  const [loading, setLoading] = useState(false);
  const [hasGroupPlan, setHasGroupPlan] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState(2);
  
  const getAdditionalMemberPrice = () => {
    // Fixed price per additional member (monthly only)
    return 2.99;
  };
  
  const getTotalAdditionalPrice = () => {
    const additionalMembers = memberCount - 1; // Number of additional members
    return (additionalMembers * getAdditionalMemberPrice()).toFixed(2);
  };
  
  const getPerPersonPrice = () => {
    // Just return the price per additional member
    return getAdditionalMemberPrice().toFixed(2);
  };
  
  useEffect(() => {
    const loadGroupPlanStatus = async () => {
      try {
        const groupPlanStatus = await AsyncStorage.getItem('hasGroupPlan');
        const savedInviteCodes = await AsyncStorage.getItem('groupPlanInviteCodes');
        
        setHasGroupPlan(groupPlanStatus === 'true');
        if (savedInviteCodes) {
          setInviteCodes(JSON.parse(savedInviteCodes));
        }
      } catch (error) {
        console.error('Error loading group plan status:', error);
      }
    };
    
    loadGroupPlanStatus();
  }, []);
  
  const handlePurchaseGroupPlan = async () => {
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate 5 unique invite codes
      const newCodes = Array(5).fill(0).map(() => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      
      // Save group plan status
      await AsyncStorage.setItem('hasGroupPlan', 'true');
      await AsyncStorage.setItem('groupPlanInviteCodes', JSON.stringify(newCodes));
      await AsyncStorage.setItem('groupPlanMemberCount', memberCount.toString());
      
      setHasGroupPlan(true);
      setInviteCodes(newCodes);
      
      Alert.alert(
        'Success!',
        'You now have 5 invite codes to share with friends and family.',
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error purchasing group plan:', error);
      Alert.alert('Error', 'Failed to purchase group plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShareInvite = async (code = inviteCodes[0]) => {
    if (!code) return;
    
    try {
      const result = await Share.share({
        message: `Join my Bliss Alarm group with this invite code: ${code}\n\nDownload the app: https://blissalarm.app/download`,
        title: 'Join My Bliss Alarm Group',
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };
  
  const handleCopyInviteCode = () => {
    if (inviteCodes.length > 0) {
      // In a real app, you would use Clipboard.setString(inviteCodes[0])
      Alert.alert(
        'Copied!',
        `Invite code ${inviteCodes[0]} copied to clipboard.`,
        [{ text: 'OK' }]
      );
    }
  };
  
  const handleResetGroupPlan = async () => {
    try {
      await AsyncStorage.removeItem('hasGroupPlan');
      await AsyncStorage.removeItem('groupPlanInviteCodes');
      await AsyncStorage.removeItem('groupPlanMemberCount');
      
      setHasGroupPlan(false);
      setInviteCodes([]);
      
      Alert.alert(
        'Reset Complete',
        'Your group plan status has been reset for testing purposes.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error resetting group plan:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ 
        title: 'Group Plan',
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#fff',
      }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="people" size={48} color="#0A84FF" />
          <Text style={styles.title}>Group Plan</Text>
          <Text style={styles.subtitle}>
            Share premium features with your partner, friends, or family
          </Text>
        </View>
        
        {hasGroupPlan ? (
          <View style={styles.managePlanSection}>
            <View style={styles.inviteCodesContainer}>
              <Text style={styles.inviteCodesTitle}>Your Invite Codes</Text>
              <Text style={styles.inviteCodesSubtitle}>
                Share these codes with friends and family. Each code can be used once.
              </Text>
              
              {inviteCodes.map((code, index) => (
                <View key={index} style={styles.codeRow}>
                  <Text style={styles.codeNumber}>{index + 1}.</Text>
                  <Text style={styles.inviteCode}>{code}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => {
                      // In a real app, you would use Clipboard.setString(code)
                      Alert.alert('Copied!', `Invite code ${code} copied to clipboard.`);
                    }}
                  >
                    <Ionicons name="copy-outline" size={20} color="#0A84FF" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={() => {
                  Share.share({
                    message: `Join my Bliss Alarm group with these invite codes:\n\n${inviteCodes.join('\n')}\n\nDownload the app: https://blissalarm.app/download`,
                    title: 'Join My Bliss Alarm Group'
                  });
                }}
              >
                <Ionicons name="share-outline" size={20} color="#fff" style={styles.shareIcon} />
                <Text style={styles.shareButtonText}>Share All Codes</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.membersSection}>
              <Text style={styles.membersSectionTitle}>
                Active Members (1/{memberCount})
              </Text>
              
              <View style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>Y</Text>
                </View>
                <Text style={styles.memberName}>You (Owner)</Text>
              </View>
              
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No one has joined your group plan yet. Share your invite code to add members.
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleResetGroupPlan}
            >
              <Text style={styles.resetButtonText}>Reset Group Plan (Testing Only)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.purchaseSection}>
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Group Plan</Text>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>${getTotalAdditionalPrice()}/mo</Text>
                </View>
              </View>
              
              <View style={styles.memberSelector}>
                <Text style={styles.memberSelectorLabel}>
                  Additional members: {memberCount - 1}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={memberCount - 1}
                  onValueChange={(value) => setMemberCount(value + 1)}
                  minimumTrackTintColor="#0A84FF"
                  maximumTrackTintColor="#4A4A4A"
                  thumbTintColor="#0A84FF"
                />
                <Text style={styles.pricePerPerson}>
                  ${getPerPersonPrice()} per additional person
                </Text>
              </View>
            </View>
            
            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "I share this with my roommates and we all sleep better now. The group plan is such a great value!"
              </Text>
              <View style={styles.testimonialAuthor}>
                <Text style={styles.authorName}>- Sarah, Group Plan Member</Text>
              </View>
            </View>
            
            <View style={styles.spacer} />
          </View>
        )}
      </ScrollView>
      
      {!hasGroupPlan && (
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity 
            style={styles.purchaseButton}
            onPress={handlePurchaseGroupPlan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Add {memberCount - 1} {memberCount - 1 === 1 ? 'person' : 'people'} for ${getTotalAdditionalPrice()}/mo
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.securityContainer}>
            <Text style={styles.securityText}>
              🛡️ Cancel Anytime. 24/7 support.
            </Text>
            <View style={styles.legalLinksContainer}>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/Bliss-Alarm-Privacy-Policy-Support-18df35a984814023857f01d66b34afb5')}
              >
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://ringed-lifeboat-16e.notion.site/Terms-of-Service-8d7f1d3dbd8e4cd28b0003b7ec0b6021')}
              >
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky button
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  purchaseSection: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  priceBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: {
    color: '#0A84FF',
    fontWeight: 'bold',
  },
  memberSelector: {
    marginBottom: 20,
  },
  memberSelectorLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pricePerPerson: {
    fontSize: 14,
    color: '#0A84FF',
    textAlign: 'center',
    marginTop: 5,
  },
  planFeatures: {
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  testimonialCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  testimonialText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 24,
  },
  testimonialAuthor: {
    alignItems: 'flex-end',
  },
  authorName: {
    color: '#999',
    fontSize: 14,
  },
  managePlanSection: {
    padding: 16,
  },
  inviteCodesContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  inviteCodesTitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 12,
  },
  inviteCodesSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  codeNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A84FF',
    marginRight: 12,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A84FF',
    letterSpacing: 2,
  },
  copyButton: {
    marginLeft: 12,
    padding: 4,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  shareIcon: {
    marginRight: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
  },
  membersSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  spacer: {
    height: 100,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchaseButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  securityContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLinkText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'none',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 6,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40, // Add extra margin at the bottom
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 