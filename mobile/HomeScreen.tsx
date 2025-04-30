// ✅ HomeScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from './config';
import {
  TapGestureHandler,
  TapGestureHandlerEventPayload,
  GestureEvent,
} from 'react-native-gesture-handler';
import * as Location from 'expo-location';

interface Restaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

type RestaurantWithDistance = Restaurant & { distance?: number };

type RootStackParamList = {
  Home: undefined;
  Menu: { restaurant: { id: string; name: string } };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getSimilarity(a: string, b: string) {
  a = a.toLowerCase().replace(/\s+/g, '');
  b = b.toLowerCase().replace(/\s+/g, '');
  if (a.includes(b) || b.includes(a)) return 100;
  // Split search into words and check if all are present
  const bWords = b.split(/[\s,]+/).filter(Boolean);
  let matches = 0;
  for (const word of bWords) {
    if (a.includes(word)) matches++;
  }
  return matches === bWords.length ? 90 : matches > 0 ? 70 : 0;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [proximityMode, setProximityMode] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/restaurants`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setRestaurants(data);
        } catch (parseError) {
          console.error("JSON Parse error:", text.substring(0, 100));
          throw parseError;
        }
      } catch (error) {
        console.error("Error loading restaurants:", error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handlePress = (restaurant: Restaurant) => {
    navigation.navigate('Menu', {
      restaurant: { id: restaurant.id, name: restaurant.name },
    });
  };

  const filteredRestaurants: RestaurantWithDistance[] = useMemo(() => {
    let list: RestaurantWithDistance[] = restaurants;
    if (searchText.trim()) {
      list = [...list]
        .map(r => ({
          ...r,
          similarity: getSimilarity(r.name, searchText)
        }))
        .filter(r => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity);
    }
    if (proximityMode && userLocation) {
      list = [...list]
        .map(r => ({
          ...r,
          distance: getDistance(userLocation.latitude, userLocation.longitude, r.latitude, r.longitude)
        }))
        .sort((a, b) => a.distance! - b.distance!);
    }
    return list;
  }, [restaurants, searchText, proximityMode, userLocation]);

  const handleAllowLocation = async () => {
    setLocationModalVisible(false);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    setProximityMode(true);
  };

  const handleLocationPress = () => {
    setLocationModalVisible(true);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.searchBarRow}>
        <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress}>
          <Text style={{ fontSize: 24, color: '#000' }}>📍</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Search restaurants"
          style={styles.searchBar}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading ? (
        <Text style={{ alignSelf: 'center', marginTop: 30 }}>Loading...</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {filteredRestaurants.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handlePress(item)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: '#888' }}>
                {proximityMode && item.distance !== undefined
                  ? `${item.distance.toFixed(2)} km away`
                  : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => console.log('Camera feature coming soon')}
          style={styles.cameraButton}
        >
          <Text style={styles.cameraText}>📷</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>Allow location services?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable style={styles.modalButton} onPress={async () => {
                await handleAllowLocation();
                setLocationModalVisible(false);
              }}>
                <Text style={{ color: '#fff' }}>Allow</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setLocationModalVisible(false)}>
                <Text style={{ color: '#333' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  locationButton: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRightWidth: 0,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    fontSize: 16,
    borderLeftWidth: 0,
    height: 44,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#eee',
    padding: 20,
    borderRadius: 10,
    marginTop: 40,
    marginBottom: 15,
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 90,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  cameraButton: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 30,
  },
  cameraText: {
    fontSize: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  modalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
  },
});

export default HomeScreen;