import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SymptomsPage() {
  // State to track selected symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  // Toggle symptom selection
  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(item => item !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  // Check if a symptom is selected
  const isSelected = (symptom: string) => {
    return selectedSymptoms.includes(symptom);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>
            Bad sleep can have negative impact.
          </Text>
          
          <Text style={styles.subheader}>
            Select any symptoms below:
          </Text>
          
          {/* Mental Symptoms */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>Mental</Text>
            
            <View style={styles.symptomsGrid}>
              {[
                'Feeling unmotivated',
                'Lack of ambition to pursue goals',
                'Difficulty concentrating',
                'General anxiety'
              ].map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    isSelected(symptom) && styles.selectedSymptom
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[
                    styles.symptomText,
                    isSelected(symptom) && styles.selectedSymptomText
                  ]}>
                    {symptom}
                  </Text>
                  {isSelected(symptom) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Physical Symptoms */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>Physical</Text>
            
            <View style={styles.symptomsGrid}>
              {[
                'Weight Gain',
                'Lack of muscles building',
                'Worse skin',
                'Headaches',
                'Weaker immune system'
              ].map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    isSelected(symptom) && styles.selectedSymptom
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[
                    styles.symptomText,
                    isSelected(symptom) && styles.selectedSymptomText
                  ]}>
                    {symptom}
                  </Text>
                  {isSelected(symptom) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Social Symptoms */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>Social</Text>
            
            <View style={styles.symptomsGrid}>
              {[
                'Low self-confidence',
                'Feeling unattractive or unworthy of love',
                'Feeling disconnected',
                'Lack of Patience'
              ].map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    isSelected(symptom) && styles.selectedSymptom
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[
                    styles.symptomText,
                    isSelected(symptom) && styles.selectedSymptomText
                  ]}>
                    {symptom}
                  </Text>
                  {isSelected(symptom) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Faith Symptoms */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>Faith</Text>
            
            <View style={styles.symptomsGrid}>
              {[
                'Feeling distant from God'
              ].map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    isSelected(symptom) && styles.selectedSymptom
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[
                    styles.symptomText,
                    isSelected(symptom) && styles.selectedSymptomText
                  ]}>
                    {symptom}
                  </Text>
                  {isSelected(symptom) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Add padding at the bottom for the sticky button */}
          <View style={{ height: 80 }} />
        </ScrollView>
        
        {/* Sticky button */}
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity 
            style={styles.rebootButton}
            onPress={() => router.push('/quiz/explanation')}
          >
            <Text style={styles.rebootButtonText}>Reboot my sleep</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9500', // Orange/sun color
    marginBottom: 20,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 25,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  symptomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    width: width * 0.44, // Approximately 2 columns with spacing
    minHeight: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  selectedSymptom: {
    backgroundColor: 'rgba(255, 149, 0, 0.3)', // Orange with opacity
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  symptomText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedSymptomText: {
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sticky button styles
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  rebootButton: {
    backgroundColor: '#FF9500', // Orange/sun color
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  rebootButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
}); 