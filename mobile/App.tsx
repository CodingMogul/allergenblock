import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MenuScreen from './MenuScreen';

interface Restaurant {
  id: string;
  name: string;
  image: string;
}

const restaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Wingstop',
    image: 'https://i.imgur.com/ZcLLrkY.jpg'
  },
  {
    id: '2',
    name: 'Mexitaco Kitchen',
    image: 'https://i.imgur.com/sM3NwXP.jpg'
  },
  {
    id: '3',
    name: 'The Fairmount',
    image: 'https://i.imgur.com/jx0tLvb.jpg'
  },
  {
    id: '4',
    name: "Aladdin's",
    image: 'https://i.imgur.com/c8KqSM4.jpg'
  }
];

const RestaurantCard = ({ item, onPress }: { item: Restaurant; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Image source={{ uri: item.image }} style={styles.image} />
    <Text style={styles.name}>{item.name}</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }: any) => {
  const handlePress = (restaurant: Restaurant) => {
    const sampleMenu = [
      {
        id: '1',
        name: 'Spicy Chicken Wings',
        image: 'https://i.imgur.com/Oj1bZbM.jpg',
        allergens: ['peanuts', 'soy']
      },
      {
        id: '2',
        name: 'Caesar Salad',
        image: 'https://i.imgur.com/UZFJYUl.jpg',
        allergens: ['dairy']
      },
      {
        id: '3',
        name: 'Garlic Bread',
        image: 'https://i.imgur.com/fnNnRkD.jpg',
        allergens: ['gluten', 'dairy']
      }
    ];

    navigation.navigate('Menu', { restaurant, menu: sampleMenu });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search restaurants"
          style={styles.searchBar}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {restaurants.map((item) => (
          <RestaurantCard key={item.id} item={item} onPress={() => handlePress(item)} />
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => console.log('Camera feature coming soon')} style={styles.cameraButton}>
          <Text style={styles.cameraText}>📷</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Restaurants' }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#fff'
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80, // allow space for the bottom bar
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: 150,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  cameraButton: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 30,
  },
  cameraText: {
    fontSize: 24,
  }
});
