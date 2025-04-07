import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const Card = ({ item, userAllergies, onSwipe }) => {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const flipValue = useSharedValue(0);
  const isFlipped = useSharedValue(false);

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

  const flipAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(flipValue.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotation}deg` }]
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(flipValue.value, [0, 0.5, 1], [1, 0, 0]),
      backfaceVisibility: 'hidden',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(flipValue.value, [0, 0.5, 1], [0, 0, 1]),
      transform: [{ rotateY: '180deg' }],
      position: 'absolute',
      backfaceVisibility: 'hidden',
    };
  });

  const handleFlip = () => {
    flipValue.value = withSpring(isFlipped.value ? 0 : 1);
    isFlipped.value = !isFlipped.value;
  };

  const hasAllergens = item.allergens.some((a) => userAllergies.includes(a));
  const cardColor = hasAllergens ? 'rgba(255, 0, 0, 0.3)' : 'white';

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
      ]
    };
  });

  return (
    <PanGestureHandler onGestureEvent={panGesture}>
      <Animated.View style={[styles.card, animatedCardStyle, { backgroundColor: cardColor }]}>
        <Animated.View style={[styles.front, flipAnimatedStyle, frontStyle]}>
          <Text style={styles.title}>{item.name}</Text>
          <Text>Ingredients: {item.ingredients.join(', ')}</Text>
          <Text onPress={handleFlip}>View Allergens</Text>
        </Animated.View>
        <Animated.View style={[styles.back, flipAnimatedStyle, backStyle]}>
          <Text>Allergens: {item.allergens.join(', ')}</Text>
          <Text onPress={handleFlip}>Back to Menu</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const App = () => {
  const [items, setItems] = useState(menuItems);
  const userAllergies = ['peanuts', 'dairy']; // define sample allergies

  const handleSwipe = (itemId, direction) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    console.log(`Swiped ${direction} on item ${itemId}`);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {items.map((item) => (
        <Card key={item.id} item={item} userAllergies={userAllergies} onSwipe={handleSwipe} />
      ))}
    </GestureHandlerRootView>
  );
};

// Sample data
const menuItems = [
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
  }
});

export default App;
