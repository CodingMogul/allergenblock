import React, { useState } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const TestCard = ({ item, onSwipe }) => {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

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
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.title}>{item.name}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default function App() {
  const [items, setItems] = useState([
    { id: 1, name: 'Swipe Me 🍕' },
    { id: 2, name: 'Or Swipe Me Too 🍔' },
  ]);

  const handleSwipe = (id, direction) => {
    console.log(`Item ${id} swiped ${direction}`);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {items.map((item) => (
        <TestCard key={item.id} item={item} onSwipe={handleSwipe} />
      ))}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.8,
    height: height * 0.6,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
