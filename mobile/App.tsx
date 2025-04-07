import React, { useState } from 'react';
import { Text, StyleSheet, Dimensions, View, ScrollView } from 'react-native';
import { TapGestureHandler, GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';

interface MenuItem {
  id: number;
  name: string;
  ingredients: string[];
  allergens: string[];
}

const { width, height } = Dimensions.get('window');

const Card = ({ item, userAllergies, onSwipe }: {
  item: MenuItem;
  userAllergies: string[];
  onSwipe: (id: number, direction: 'left' | 'right') => void;
}) => {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const flipValue = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  const handleFlip = () => {
    flipValue.value = withSpring(isFlipped.value ? 0 : 1);
    isFlipped.value = !isFlipped.value;
  };

  const panGesture = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = event.translationX;
      rotate.value = interpolate(event.translationX, [-width / 2, width / 2], [-30, 30], Extrapolation.CLAMP);
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > width / 3) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(event.translationX > 0 ? width : -width, {}, () => {
          runOnJS(onSwipe)(item.id, direction);
        });
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    }
  });

  const tapGesture = useAnimatedGestureHandler({
    onActive: () => {
      runOnJS(handleFlip)();
    }
  });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const flipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` }],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [1, 0, 0]),
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ rotateY: '180deg' }],
    position: 'absolute',
    backfaceVisibility: 'hidden',
  }));

  const hasAllergens = item.allergens.some(a => userAllergies.includes(a));
  const cardColor = hasAllergens ? 'rgba(255, 0, 0, 0.3)' : 'white';

  return (
    <PanGestureHandler onGestureEvent={panGesture}>
      <Animated.View style={[styles.card, animatedCardStyle, { backgroundColor: cardColor }]}>
        <TapGestureHandler onGestureEvent={tapGesture}>
          <Animated.View>
            <Animated.View style={[styles.front, flipAnimatedStyle, frontStyle]}>
              <Text style={styles.title}>{item.name}</Text>
              <Text>Ingredients: {item.ingredients.join(', ')}</Text>
            </Animated.View>
            <Animated.View style={[styles.back, flipAnimatedStyle, backStyle]}>
              <Text>Allergens: {item.allergens.join(', ')}</Text>
            </Animated.View>
          </Animated.View>
        </TapGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};


export default function App() {
  const [items, setItems] = useState<MenuItem[]>([...menuItems]);
  const [swipedLeft, setSwipedLeft] = useState<MenuItem[]>([]);
  const [swipedRight, setSwipedRight] = useState<MenuItem[]>([]);
  const userAllergies = ['peanuts', 'dairy'];

  const handleSwipe = (id: number, direction: 'left' | 'right') => {
    const swipedItem = items.find(item => item.id === id);
    if (!swipedItem) return;

    setItems(prev => prev.filter(item => item.id !== id));
    if (direction === 'left') {
      setSwipedLeft(prev => [...prev, swipedItem]);
    } else {
      setSwipedRight(prev => [...prev, swipedItem]);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {items.length > 0 ? (
        <Card item={items[0]} userAllergies={userAllergies} onSwipe={handleSwipe} />
      ) : (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.header}>Swipe Summary</Text>
          <Text style={styles.subheader}>Accepted Items (Swiped Right)</Text>
          {swipedRight.map(item => (
            <Text key={item.id} style={styles.resultItem}>{item.name}</Text>
          ))}
          <Text style={styles.subheader}>Rejected Items (Swiped Left)</Text>
          {swipedLeft.map(item => (
            <Text key={item.id} style={styles.resultItem}>{item.name}</Text>
          ))}
        </ScrollView>
      )}
    </GestureHandlerRootView>
  );
}

const menuItems: MenuItem[] = [
  { id: 1, name: 'Peanut Butter Toast', ingredients: ['bread', 'peanut butter'], allergens: ['peanuts'] },
  { id: 2, name: 'Cheeseburger', ingredients: ['beef', 'cheese', 'bun'], allergens: ['dairy', 'gluten'] },
  { id: 3, name: 'Salad', ingredients: ['lettuce', 'tomato'], allergens: [] },
  { id: 4, name: 'Shrimp Alfredo', ingredients: ['shrimp', 'cream', 'pasta'], allergens: ['shellfish', 'dairy', 'gluten'] },
  { id: 5, name: 'Tofu Stir Fry', ingredients: ['tofu', 'soy sauce', 'vegetables'], allergens: ['soy'] },
  { id: 6, name: 'Nut-Free Brownie', ingredients: ['chocolate', 'butter', 'flour'], allergens: ['dairy', 'gluten'] },
  { id: 7, name: 'Vegan Wrap', ingredients: ['tortilla', 'hummus', 'spinach'], allergens: ['gluten'] },
  { id: 8, name: 'Grilled Chicken', ingredients: ['chicken', 'spices'], allergens: [] },
  { id: 9, name: 'Milkshake', ingredients: ['milk', 'ice cream', 'syrup'], allergens: ['dairy'] },
  { id: 10, name: 'Egg Salad Sandwich', ingredients: ['eggs', 'mayonnaise', 'bread'], allergens: ['eggs', 'gluten'] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingTop: 100,
  },
  card: {
    width: width * 0.8,
    height: height * 0.7,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backfaceVisibility: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  front: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  back: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'center',
  },
  subheader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 5,
    alignSelf: 'center',
  },
  resultItem: {
    fontSize: 16,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  scrollView: {
    width: '100%',
    padding: 20,
  },
});
