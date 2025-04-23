import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  TapGestureHandler,
  GestureHandlerRootView,
  TapGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  interpolate,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const userAllergies = ['peanuts', 'gluten', 'dairy'];

interface MenuItem {
  id: string;
  name: string;
  image: string;
  allergens: string[];
}

export default function MenuScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { restaurant } = route.params as {
    restaurant: { id: string; name: string };
  };

  const menu: MenuItem[] = (() => {
    switch (restaurant.id) {
      case '1':
        return [
          { id: '1', name: 'Spicy Chicken Wings', image: 'https://i.imgur.com/Oj1bZbM.jpg', allergens: ['peanuts', 'soy'] },
          { id: '2', name: 'Garlic Fries', image: 'https://i.imgur.com/bVnABFe.jpg', allergens: ['gluten'] },
          { id: '3', name: 'Coleslaw', image: 'https://i.imgur.com/fnNnRkD.jpg', allergens: [] },
        ];
      case '2':
        return [
          { id: '1', name: 'Taco al Pastor', image: 'https://i.imgur.com/m4VQpsa.jpg', allergens: ['gluten'] },
          { id: '2', name: 'Quesadilla', image: 'https://i.imgur.com/UZFJYUl.jpg', allergens: ['dairy'] },
          { id: '3', name: 'Guacamole & Chips', image: 'https://i.imgur.com/TvYUSsC.jpg', allergens: [] },
        ];
      case '3':
        return [
          { id: '1', name: 'Stuffed Mushrooms', image: 'https://i.imgur.com/eW1bYHc.jpg', allergens: ['dairy'] },
          { id: '2', name: 'Margherita Flatbread', image: 'https://i.imgur.com/OMp4B1D.jpg', allergens: ['gluten', 'dairy'] },
          { id: '3', name: 'Mixed Greens Salad', image: 'https://i.imgur.com/3aUahN5.jpg', allergens: [] },
        ];
      case '4':
        return [
          { id: '1', name: 'Hummus Platter', image: 'https://i.imgur.com/LpWfHz6.jpg', allergens: [] },
          { id: '2', name: 'Falafel Wrap', image: 'https://i.imgur.com/E0gKcm3.jpg', allergens: ['gluten'] },
          { id: '3', name: 'Lentil Soup', image: 'https://i.imgur.com/fnNnRkD.jpg', allergens: [] },
        ];
      default:
        return [];
    }
  })();

  const Card = ({ item }: { item: MenuItem }) => {
    const flipValue = useSharedValue(0);
    const isFlipped = useSharedValue(false);

    const handleFlip = () => {
      flipValue.value = withSpring(isFlipped.value ? 0 : 1);
      isFlipped.value = !isFlipped.value;
    };

    const tapGesture = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
      onActive: () => {
        runOnJS(handleFlip)();
      },
    });

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

    const allergenText = item.allergens.map(a =>
      userAllergies.includes(a) ? `**${a}**` : a
    ).join(', ');

    return (
      <TapGestureHandler onGestureEvent={tapGesture}>
        <Animated.View style={[styles.menuCard, flipAnimatedStyle, { backgroundColor: cardColor }]}>  
          <Animated.View style={[styles.cardFace, frontStyle]}>          
            <Image source={{ uri: item.image }} style={styles.menuImage} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Text style={styles.menuItemAllergens}>
                {item.allergens.filter(a => userAllergies.includes(a)).length} allergen(s) match your profile
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.cardFace, backStyle]}>
            <Text style={styles.menuItemName}>{item.name}</Text>
            <Text style={styles.menuItemAllergens}>Contains:</Text>
            {item.allergens.map((a, i) => (
              <Text key={i} style={{ fontWeight: userAllergies.includes(a) ? 'bold' : 'normal' }}>{a}</Text>
            ))}
          </Animated.View>
        </Animated.View>
      </TapGestureHandler>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.header}>{restaurant.name} Menu</Text>
      <FlatList
        data={menu}
        renderItem={({ item }) => <Card item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollView}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'center',
  },
  scrollView: {
    width: '100%',
    padding: 20,
  },
  menuCard: {
    width: width - 40,
    height: 100,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFace: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItemAllergens: {
    fontSize: 14,
    color: 'red',
    marginTop: 4,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 30,
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    color: '#007bff',
  },
});