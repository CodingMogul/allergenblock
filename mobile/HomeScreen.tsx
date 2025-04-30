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
  Image,
  Button,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from './config';
import {
  TapGestureHandler,
  TapGestureHandlerEventPayload,
  GestureEvent,
  LongPressGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Restaurant {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

type RestaurantWithDistance = Restaurant & { distance?: number };

type RootStackParamList = {
  Home: undefined;
  Menu: { restaurant: { id: string; name: string } };
  Camera: undefined;
  ProfileSetup: { canGoBack?: boolean };
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
  const [image, setImage] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantNameModalVisible, setRestaurantNameModalVisible] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantNameInput, setRestaurantNameInput] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastInitial, setUserLastInitial] = useState('');

  // Fetch restaurants function (moved outside useEffect for reuse)
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
        console.log('Fetched restaurants:', data);
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

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const profile = await AsyncStorage.getItem('userProfile');
        if (profile) {
          const { firstName, lastName } = JSON.parse(profile);
          setUserFirstName(firstName || '');
          setUserLastInitial(lastName && lastName.length > 0 ? lastName[0].toUpperCase() : '');
        }
      } catch {}
    };
    loadUserName();
  }, []);

  const handlePress = (restaurant: Restaurant) => {
    navigation.navigate('Menu', {
      restaurant: { id: restaurant.id, name: restaurant.name },
    });
  };

  // Filter out hidden restaurants
  const visibleRestaurants = restaurants.filter(r => !(r as any).hidden);

  const filteredRestaurants: RestaurantWithDistance[] = useMemo(() => {
    let list: RestaurantWithDistance[] = visibleRestaurants;
    if (locationFilter) {
      // If location filter is active, sort by distance
      list = list
        .map(r => {
          if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
            return {
              ...r,
              distance: getDistance(locationFilter.lat, locationFilter.lng, r.latitude, r.longitude)
            };
          }
          return { ...r, distance: Infinity };
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (searchText.trim()) {
      // Reorder by similarity, do not filter out
      const search = searchText.trim().toLowerCase();
      list = [...list]
        .map(r => ({
          ...r,
          similarity: getSimilarity(r.name, searchText)
        }))
        .sort((a, b) => b.similarity - a.similarity);
    }
    return list;
  }, [visibleRestaurants, searchText, locationFilter]);

  const uploadMenuImage = async (base64: string, restaurantName: string, location: { lat: number; lng: number }) => {
    try {
      console.log('Uploading image to backend...');
      const response = await fetch(`${BASE_URL}/api/upload-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          restaurantName,
          location,
        }),
      });
      const data = await response.json();
      if (data.success && data.gemini && data.mongo) {
        console.log('Image processed by Gemini and uploaded to MongoDB!');
        Alert.alert('Success', 'Image processed and uploaded!');
      } else {
        console.log('Processing or upload failed:', data);
        Alert.alert('Error', 'Processing or upload failed.');
      }
    } catch (err: any) {
      console.log('Error uploading image:', err);
      Alert.alert('Error', 'Error uploading image: ' + err.message);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
      let location = locationFilter;
      if (!location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setLocationFilter(location);
        } else {
          location = { lat: 0, lng: 0 };
        }
      }
      setPendingImageBase64(base64);
      setPendingImageUri(result.assets[0].uri);
      setPendingLocation(location);
      setRestaurantNameInput('');
      setRestaurantNameModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
      let location = locationFilter;
      if (!location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setLocationFilter(location);
        } else {
          location = { lat: 0, lng: 0 };
        }
      }
      setPendingImageBase64(base64);
      setPendingImageUri(result.assets[0].uri);
      setPendingLocation(location);
      setRestaurantNameInput('');
      setRestaurantNameModalVisible(true);
    }
  };

  const handleRestaurantNameSubmit = async () => {
    if (!restaurantNameInput.trim()) {
      Alert.alert('Please enter a restaurant name.');
      return;
    }
    setRestaurantNameModalVisible(false);
    if (pendingImageBase64 && pendingLocation) {
      await uploadMenuImage(pendingImageBase64, restaurantNameInput.trim(), pendingLocation);
      setPendingImageBase64(null);
      setPendingImageUri(null);
      setPendingLocation(null);
      setRestaurantNameInput('');
      // Refresh restaurant list
      setLoading(true);
      await fetchRestaurants();
    }
  };

  const handleLocationPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to filter nearby restaurants.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocationFilter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err: any) {
      Alert.alert('Error', 'Could not get location: ' + err.message);
    }
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
  };

  const goToProfileSetup = () => {
    navigation.navigate('ProfileSetup', { canGoBack: true });
  };

  const handleLongPress = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant);
    setDeleteModalVisible(true);
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    try {
      const response = await fetch(`${BASE_URL}/api/restaurants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: restaurantToDelete.id, hidden: true }),
      });
      if (response.ok) {
        setRestaurants(prev => prev.map(r => r.id === restaurantToDelete.id ? { ...r, hidden: true } : r));
      } else {
        Alert.alert('Error', 'Failed to hide restaurant.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to hide restaurant.');
    } finally {
      setDeleteModalVisible(false);
      setRestaurantToDelete(null);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* User name in top left */}
      {userFirstName ? (
        <View style={styles.userNameContainer}>
          <Text style={styles.userNameText}>
            {userFirstName}{userLastInitial ? ` ${userLastInitial}.` : ''}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.profileButton} onPress={goToProfileSetup} accessibilityLabel="Profile">
        <Feather name="user" size={30} color="#222" />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          <Text style={styles.epi}>Epi</Text>
          <Text style={styles.eats}>Eats</Text>
        </Text>
      </View>
      <View style={styles.searchBarRow}>
        <TouchableOpacity
          style={[styles.locationButton, locationFilter ? styles.locationButtonActive : null]}
          onPress={async () => {
            if (locationFilter) {
              setLocationFilter(null);
            } else {
              await handleLocationPress();
            }
          }}
        >
          <Text style={{ fontSize: 24, color: locationFilter ? '#fff' : '#000' }}>📍</Text>
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
          {filteredRestaurants.map((item) => {
            // Calculate distance if locationFilter is active and restaurant has coordinates
            let distance: number | null = null;
            if (
              locationFilter &&
              typeof item.latitude === 'number' &&
              typeof item.longitude === 'number'
            ) {
              distance = getDistance(
                locationFilter.lat,
                locationFilter.lng,
                item.latitude,
                item.longitude
              );
            }
            return (
              <LongPressGestureHandler
                key={item.id}
                onHandlerStateChange={({ nativeEvent }) => {
                  if (nativeEvent.state === GestureState.ACTIVE) {
                    handleLongPress(item);
                  }
                }}
                minDurationMs={600}
              >
                <View>
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => handlePress(item)}
                  >
                    <Text style={styles.name}>{item.name}</Text>
                    {locationFilter && distance !== null && (
                      <Text style={styles.distanceText}>
                        <Text style={{ fontStyle: 'italic', color: '#555' }}>{distance.toFixed(1)} miles away</Text>
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LongPressGestureHandler>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.iconRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={pickImage}
            accessibilityLabel="Pick an image from camera roll"
          >
            <MaterialIcons name="insert-photo" size={32} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={takePhoto}
            accessibilityLabel="Take a photo"
          >
            <Feather name="camera" size={32} color="#222" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={restaurantNameModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRestaurantNameModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#222' }}>Enter Restaurant Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginBottom: 18, fontSize: 16 }}
              placeholder="Restaurant Name"
              value={restaurantNameInput}
              onChangeText={setRestaurantNameInput}
              autoFocus
            />
            <TouchableOpacity
              style={{ backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' }}
              onPress={handleRestaurantNameSubmit}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 18, color: '#222' }}>
              Delete this restaurant?
            </Text>
            <Text style={{ fontSize: 16, marginBottom: 18, color: '#444', textAlign: 'center' }}>
              Are you sure you want to delete "{restaurantToDelete?.name}"?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#eee', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, marginRight: 8 }}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={{ color: '#222', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#ff4d4d', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 }}
                onPress={handleDeleteRestaurant}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
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
    paddingTop: 150,
    backgroundColor: '#fff',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flexDirection: 'row',
    fontSize: 54,
    textAlign: 'center',
    marginBottom: 8,
  },
  epi: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400',
    color: '#222',
  },
  eats: {
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    color: '#DA291C',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 32,
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
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 2,
    padding: 20,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 8,
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
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  iconButton: {
    backgroundColor: '#fff',
    borderRadius: 32,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
    marginHorizontal: 12,
    alignSelf: 'center',
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
  locationButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  profileButton: {
    position: 'absolute',
    top: 80,
    right: 24,
    zIndex: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  userNameContainer: {
    position: 'absolute',
    top: 80,
    left: 24,
    zIndex: 11,
    backgroundColor: 'transparent',
  },
  userNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#DA291C',
    fontFamily: 'Inter-Bold',
  },
  distanceText: {
    marginTop: 8,
    fontSize: 15,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
  },
});

export default HomeScreen;