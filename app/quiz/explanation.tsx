import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  FlatListProps,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CacheManager } from 'react-native-expo-image-cache';

const { width, height } = Dimensions.get('window');

// Content for each slide
const slides = [
  {
    id: '1',
    title: 'The Hidden Cost of Bad Sleep',
    content: 'Just one bad night can increase disease risk, weaken immunity, and drain your energy. Over time, poor sleep wrecks your health, looks, and focus—without you even realizing it.',
    backgroundColor: '#FF3B30', // Red background
    image: require('../../assets/images/e1.webp'),
  },
  {
    id: '2',
    title: 'Sleep Ruins Your Social Life',
    content: 'Tired? You are less patient, less confident, and harder to connect with. Conversations feel forced. Social events feel exhausting. Bad sleep even makes you look less approachable. People notice.',
    backgroundColor: '#FF3B30', // Red background
    image: require('../../assets/images/e2.webp'),
  },
  {
    id: '3',
    title: 'Sleep Wrecks Your Body & Appearance',
    content: 'Sleep deprivation slows metabolism, weakens immunity, and causes weight gain. Worse? It ages your skin—causing dark circles, puffiness, dullness, and breakouts. No skincare can undo chronic bad sleep.',
    backgroundColor: '#FF3B30', // Red background
    image: require('../../assets/images/e3.webp'),
  },
  {
    id: '4',
    title: 'Bad Sleep Destroys Your Happiness',
    content: 'Low energy. Brain fog. Stress. Anxiety. Poor sleep kills motivation and joy, making life feel harder. The worst part? You do not even realize how much better you could feel.',
    backgroundColor: '#FF3B30', // Red background
    image: require('../../assets/images/e4.webp'),
  },
  {
    id: '5',
    title: 'Great Sleep = A Better Life',
    content: 'Fixing your sleep changes everything—more energy, clearer skin, better focus, and real confidence. You wake up refreshed, feel motivated, and actually enjoy your day. The best part? It is possible. Small changes lead to huge results. Ready to take control?',
    backgroundColor: '#34C759', // Green background
    image: require('../../assets/images/e5.webp'),
  },
];

// Define a type for slide items
type SlideItem = {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  image: any;
};

export default function ExplanationScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideItem>>(null);

  // Preload all images
  useEffect(() => {
    const preloadImages = async () => {
      try {
        // Preload all slide images
        for (const slide of slides) {
          const uri = Image.resolveAssetSource(slide.image).uri;
          await CacheManager.get(uri, { headers: {} }).getPath();
        }
      } catch (error) {
        console.error('Error preloading images:', error);
      }
    };
    
    preloadImages();
  }, []);

  const renderSlide = ({ item, index }: { item: SlideItem; index: number }) => {
    return (
      <View 
        style={[
          styles.slide, 
          { backgroundColor: item.backgroundColor }
        ]}
      >
        <View style={styles.slideContent}>
          {/* Image above the text */}
          <View style={styles.imageContainer}>
            <Image 
              source={item.image}
              style={styles.slideImage}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.content}>{item.content}</Text>
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.navigationContainer}>
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  i === index ? styles.paginationDotActive : null,
                ]}
              />
            ))}
          </View>
          
          {/* Next button or final button */}
          {index < slides.length - 1 ? (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => {
                const nextIndex = index + 1;
                setCurrentIndex(nextIndex);
                flatListRef.current?.scrollToIndex({
                  index: nextIndex,
                  animated: true,
                });
              }}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: '#34C759' }]}
              onPress={() => router.push('/quiz/rise')}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentIndex(index);
          }}
          initialScrollIndex={currentIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  imageContainer: {
    width: width * 0.7,
    height: height * 0.25,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
  },
  navigationContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
}); 