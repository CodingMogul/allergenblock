import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PeanutOutline from '../../assets/icons/PeanutOutline.svg';
import Milk from '../../assets/icons/Milk.svg';
import Eggs from '../../assets/icons/Eggs.svg';
import FishOutline from '../../assets/icons/FishOutline.svg';
import Shrimp from '../../assets/icons/Shrimp.svg';
import TreePine from '../../assets/icons/TreePine.svg';
import Bread from '../../assets/icons/Bread.svg';
import Beans from '../../assets/icons/Beans.svg';
import Sesame from '../../assets/icons/Sesame.svg';

const ALLERGENS = [
  { id: 'dairy', name: 'Dairy' },
  { id: 'eggs', name: 'Eggs' },
  { id: 'peanuts', name: 'Peanuts' },
  { id: 'treenuts', name: 'Tree Nuts' },
  { id: 'shellfish', name: 'Shellfish' },
  { id: 'fish', name: 'Fish' },
  { id: 'gluten', name: 'Gluten' },
  { id: 'soy', name: 'Soy' },
  { id: 'sesame', name: 'Sesame' },
];

const allergenIcons = {
  peanut: PeanutOutline,
  milk: Milk,
  egg: Eggs,
  eggs: Eggs,
  fish: FishOutline,
  shellfish: Shrimp,
  'tree nut': TreePine,
  'tree nuts': TreePine,
  gluten: Bread,
  wheat: Bread,
  soy: Beans,
  sesame: Sesame,
  dairy: Milk,
  treenuts: TreePine,
  peanuts: PeanutOutline,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

export default function OnboardingCarouselDemo() {
  const carouselRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let i = 0;
    setAnimating(true);
    const animate = async () => {
      while (isMounted && i < ALLERGENS.length) {
        carouselRef.current?.scrollTo({ index: i, animated: true });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentIndex(i);
        await new Promise(res => setTimeout(res, 700));
        i++;
      }
      setAnimating(false);
    };
    animate();
    return () => { isMounted = false; };
  }, []);

  const replayDemo = () => {
    let i = 0;
    setAnimating(true);
    const animate = async () => {
      while (i < ALLERGENS.length) {
        carouselRef.current?.scrollTo({ index: i, animated: true });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentIndex(i);
        await new Promise(res => setTimeout(res, 700));
        i++;
      }
      setAnimating(false);
    };
    animate();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How to Select Allergens</Text>
      <Text style={styles.subtitle}>Swipe or tap to select your allergens. Only the centered card is selectable.</Text>
      <Carousel
        ref={carouselRef}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        data={ALLERGENS}
        loop={false}
        autoPlay={false}
        mode="parallax"
        modeConfig={{ parallaxScrollingScale: 0.85, parallaxScrollingOffset: 60 }}
        snapEnabled={true}
        onSnapToItem={setCurrentIndex}
        renderItem={({ item, index }) => {
          let iconKey = item.id.toLowerCase();
          if (iconKey === 'peanuts') iconKey = 'peanut';
          if (iconKey === 'treenuts') iconKey = 'tree nuts';
          if (iconKey === 'eggs' || iconKey === 'egg') iconKey = 'eggs';
          if (iconKey === 'shellfish') iconKey = 'shellfish';
          if (iconKey === 'dairy' || iconKey === 'milk') iconKey = 'milk';
          if (iconKey === 'gluten' || iconKey === 'wheat') iconKey = 'gluten';
          if (iconKey === 'soy') iconKey = 'soy';
          if (iconKey === 'sesame') iconKey = 'sesame';
          const Icon = allergenIcons[iconKey];
          const isCentered = index === currentIndex;
          return (
            <View style={[
              styles.carouselCard,
              isCentered && styles.carouselCardSelected
            ]}>
              {Icon && <Icon width="80%" height="80%" />}
              <Text style={styles.cardText}>{item.name}</Text>
              {isCentered && (
                <Feather
                  name="check-circle"
                  size={24}
                  color="#DA291C"
                  style={{ position: 'absolute', top: 10, right: 10 }}
                />
              )}
            </View>
          );
        }}
      />
      <TouchableOpacity style={styles.replayButton} onPress={replayDemo} disabled={animating}>
        <Text style={styles.replayButtonText}>{animating ? 'Demo Playing...' : 'Replay Demo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#DA291C', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#222', marginBottom: 24, textAlign: 'center' },
  carouselCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 10,
    position: 'relative',
  },
  carouselCardSelected: {
    backgroundColor: '#ffeaea',
    borderWidth: 2,
    borderColor: '#DA291C',
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  replayButton: {
    marginTop: 32,
    backgroundColor: '#DA291C',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  replayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 