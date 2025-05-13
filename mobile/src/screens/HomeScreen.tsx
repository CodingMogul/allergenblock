// ✅ HomeScreen.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from '../../config';
import {
  TapGestureHandler,
  TapGestureHandlerEventPayload,
  GestureEvent,
  LongPressGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { deleteRestaurant, editRestaurant, getRestaurants, addRestaurant } from '../storage/restaurantStorage';
import { fetchGooglePlace } from '../api/googleApi';
import { fetchLogoDevUrl } from '../api/logoDevApi';
import uuid from 'react-native-uuid';
import { Restaurant, MenuItem } from '../restaurantData';

interface Restaurant {
  id: string;
  name: string;
  displayName?: string;
  latitude?: number;
  longitude?: number;
  brandLogo?: string;
}

type RestaurantWithDistance = Restaurant & { distance?: number, similarity?: number };

type RootStackParamList = {
  Home: undefined;
  Menu: { restaurant: { id: string; name: string; apimatch?: string; brandLogo?: string } };
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

// Helper to compute distance between two lat/lng points in meters
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Update getGoogleMatchedName to return both name and location if matched
async function getGoogleMatchedNameAndLocation(inputName: string, location: { lat: number; lng: number }) {
  try {
    const params = new URLSearchParams({
      restaurantName: inputName,
      lat: String(location.lat),
      lng: String(location.lng),
    });
    const res = await fetch(`${BASE_URL}/api/maps?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.apimatch === 'google' && data.googlePlace && data.googlePlace.name && data.googlePlace.location) {
        return {
          name: data.googlePlace.name,
          location: data.googlePlace.location,
        };
      }
    }
  } catch {}
  return { name: inputName, location };
}

function normalizeGeminiMenuItems(rawMenuItems: any[]): MenuItem[] {
  return rawMenuItems.map((item, idx) => ({
    id: item.id || idx.toString(),
    name: item.name,
    allergens: item.allergens || [],
    certainty: item.certainty,
  }));
}

function createRestaurantFromGemini(data: any, restaurantName: string, location: { lat: number, lng: number }): Restaurant {
  return {
    id: uuid.v4(),
    restaurantName: data.restaurantName || restaurantName,
    location: {
      type: 'Point',
      coordinates: [
        (data.location && data.location.lng) || location.lng,
        (data.location && data.location.lat) || location.lat,
      ],
    },
    menuItems: normalizeGeminiMenuItems(data.menuItems || []),
    source: data.source || 'camera',
    apimatch: data.apimatch,
    googlePlace: data.googlePlace,
    brandLogo: data.brandLogo,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    hidden: false,
  };
}

// Helper to get the best display name for a restaurant
function getDisplayName(restaurant: any) {
  return (
    restaurant.verifiedName ||
    restaurant.restaurantName ||
    restaurant.name ||
    'Unnamed Restaurant'
  );
}

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
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
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [newlyAddedRestaurantId, setNewlyAddedRestaurantId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [googleMatchedName, setGoogleMatchedName] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showNoMenuModal, setShowNoMenuModal] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [cardAnim] = React.useState(new Animated.Value(0));
  const noMenuFadeAnim = React.useRef(new Animated.Value(1)).current;
  const magnifierFadeAnim = React.useRef(new Animated.Value(1)).current;
  const cautionFadeAnim = React.useRef(new Animated.Value(0)).current;
  // Success overlay animation values
  const successMagnifierFadeAnim = React.useRef(new Animated.Value(1)).current;
  const successCheckFadeAnim = React.useRef(new Animated.Value(0)).current;
  const [showHomeFadeIn, setShowHomeFadeIn] = useState(false);
  const homeFadeAnim = useRef(new Animated.Value(0)).current;
  const [successOverlayAnim] = useState(new Animated.Value(1));
  // Add state for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  // Fetch restaurants function (moved outside useEffect for reuse)
  const fetchRestaurants = async () => {
    setNetworkError(false);
    setLoading(true);
    let timeout: NodeJS.Timeout | null = null;
    timeout = setTimeout(() => {
      setNetworkError(true);
      setLoading(false);
    }, 4000);
    try {
      const data = await getRestaurants();
      setRestaurants(data);
      setNetworkError(false);
      if (timeout) clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
      return data;
    } catch (error) {
      setNetworkError(true);
      if (timeout) clearTimeout(timeout);
      setRestaurants([]);
      setLoading(false);
      setRefreshing(false);
      return [];
    }
  };

  useEffect(() => {
    setLoading(true);
    setNetworkError(false);
    fetchRestaurants();
  }, []);

  // Refetch restaurants on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRestaurants();
    }, [])
  );

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

  const handlePress = (restaurant: RestaurantWithDistance & { apimatch?: string; brandLogo?: string }) => {
    navigation.navigate('Menu', {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        apimatch: (restaurant as any).apimatch,
        brandLogo: (restaurant as any).brandLogo,
      },
    });
  };

  // Filter out hidden restaurants, but allow the best matching hidden restaurant to appear at the top if searching
  const filteredRestaurants: RestaurantWithDistance[] = useMemo(() => {
    let list: RestaurantWithDistance[] = restaurants.filter(r => !(r as any).hidden);
    let bestHiddenMatch: RestaurantWithDistance | null = null;
    if (searchText.trim()) {
      // Find the best matching hidden restaurant
      const hiddenRestaurants = restaurants.filter(r => (r as any).hidden);
      let bestScore = -1;
      hiddenRestaurants.forEach(r => {
        const similarity = getSimilarity(r.name, searchText);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestHiddenMatch = { ...r, similarity };
        }
      });
      // If the best hidden match is reasonably similar, show it at the top
      if (bestHiddenMatch && bestScore >= 70) {
        list = [bestHiddenMatch, ...list.filter(r => r.id !== bestHiddenMatch!.id)];
      }
      // Reorder by similarity, do not filter out
      const search = searchText.trim().toLowerCase();
      list = [...list]
        .map(r => ({
          ...r,
          similarity: getSimilarity(r.name, searchText)
        }))
        .sort((a, b) => b.similarity - a.similarity);
    } else if (locationFilter) {
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
    }
    return list;
  }, [restaurants, searchText, locationFilter]);

  const uploadMenuImage = async (base64: string, restaurantName: string, location: { lat: number; lng: number }) => {
    try {
      // Call backend for Gemini processing
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
      // Robustly extract menuItems and other fields
      let menuItems = [];
      if (data.menuItems) {
        menuItems = data.menuItems;
      } else if (data.data && data.data.menuItems) {
        menuItems = data.data.menuItems;
      } else if (data.gemini && data.gemini.menuItems) {
        menuItems = data.gemini.menuItems;
      }
      if (menuItems && menuItems.length > 0) {
        // 1. Google API match for name/location
        let verifiedName = restaurantName;
        let verifiedLocation = location;
        let googlePlace = undefined;
        let apimatch = undefined;
        const googleResult = await fetchGooglePlace(restaurantName, location);
        if (googleResult && googleResult.name && googleResult.location) {
          // Check if within 100 meters
          const dist = getDistanceMeters(
            location.lat,
            location.lng,
            googleResult.location.lat,
            googleResult.location.lng
          );
          if (dist < 100) {
            verifiedName = googleResult.name;
            verifiedLocation = googleResult.location;
            googlePlace = googleResult;
            apimatch = 'google';
          }
        }
        // 2. logo.dev for logo
        const brandLogo = await fetchLogoDevUrl(verifiedName);
        // 3. Save to AsyncStorage with all info
        const newRestaurant = {
          id: uuid.v4(),
          restaurantName,
          verifiedName,
          location: {
            type: 'Point',
            coordinates: [verifiedLocation.lng, verifiedLocation.lat],
          },
          verifiedLocation,
          menuItems: normalizeGeminiMenuItems(menuItems),
          source: data.source || 'camera',
          apimatch,
          googlePlace,
          brandLogo,
          updatedAt: Date.now(),
          createdAt: Date.now(),
          hidden: false,
        };
        await addRestaurant(newRestaurant);
        setShowLoadingOverlay(false);
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
          InteractionManager.runAfterInteractions(() => {
            fetchRestaurants().then((list) => {
              const newCard = list.find(r => r.id === newRestaurant.id);
              if (newCard) {
                setNewlyAddedRestaurantId(newCard.id);
                Animated.sequence([
                  Animated.timing(cardAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
                  Animated.delay(1000),
                  Animated.timing(cardAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
                ]).start(() => setNewlyAddedRestaurantId(null));
              }
            });
          });
        }, 900);
      } else {
        console.log('Processing or upload failed:', data);
        setShowLoadingOverlay(false);
        setShowSuccessOverlay(false);
        setShowNoMenuModal(true);
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

  const takePhoto = () => {
    navigation.navigate('Camera');
  };

  const handleRestaurantNameSubmit = async () => {
    if (!restaurantNameInput.trim()) {
      Alert.alert('Please enter a restaurant name.');
      return;
    }
    setRestaurantNameModalVisible(false);
    setShowLoadingOverlay(true);
    if (pendingImageBase64 && pendingLocation) {
      // Get Google-matched name and location before upload
      const googleResult = await getGoogleMatchedNameAndLocation(restaurantNameInput.trim(), pendingLocation);
      let useName = googleResult.name;
      let useLocation = pendingLocation;
      if (googleResult.location) {
        const dist = getDistanceMeters(
          pendingLocation.lat,
          pendingLocation.lng,
          googleResult.location.lat,
          googleResult.location.lng
        );
        useLocation = googleResult.location;
      }
      // Upload and handle response
      await uploadMenuImage(pendingImageBase64, useName, useLocation);
      setPendingImageBase64(null);
      setPendingImageUri(null);
      setPendingLocation(null);
      setRestaurantNameInput('');
      setShowLoadingOverlay(false);
      setShowSuccessOverlay(true);
      setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 1800);
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
    setDeleting(true);
    try {
      await deleteRestaurant(restaurantToDelete.id);
      await fetchRestaurants();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete restaurant.');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setRestaurantToDelete(null);
    }
  };

  useEffect(() => {
    if (!searchText.trim()) {
      setGoogleMatchedName(null);
      return;
    }
    // Debounce API call
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      let lat = locationFilter?.lat;
      let lng = locationFilter?.lng;
      try {
        const params = new URLSearchParams({
          restaurantName: searchText,
          lat: lat ? String(lat) : '0',
          lng: lng ? String(lng) : '0',
        });
        const res = await fetch(`${BASE_URL}/api/maps?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.apimatch === 'google' && data.googlePlace && data.googlePlace.name) {
            if (data.googlePlace.name !== searchText) {
              setGoogleMatchedName(data.googlePlace.name);
              setSearchText(data.googlePlace.name);
            }
            // Update locationFilter to Google-provided lat/lng if different
            if (
              data.googlePlace.location &&
              (data.googlePlace.location.lat !== locationFilter?.lat || data.googlePlace.location.lng !== locationFilter?.lng)
            ) {
              setLocationFilter({
                lat: data.googlePlace.location.lat,
                lng: data.googlePlace.location.lng,
              });
            }
          }
        }
      } catch (e) {}
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, locationFilter]);

  // Fade-in effect when navigating home after success
  useEffect(() => {
    if ((route as any).params?.fadeIn) {
      setShowHomeFadeIn(true);
      homeFadeAnim.setValue(0);
      Animated.timing(homeFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setShowHomeFadeIn(false);
        (navigation as any).setParams?.({ fadeIn: undefined });
      });
    }
  }, [route]);

  // Add useEffect to handle returned photoUri
  useEffect(() => {
    if ((route as any).params?.photoUri) {
      const photoUri = (route as any).params.photoUri;
      (async () => {
        const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
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
        setPendingImageUri(photoUri);
        setPendingLocation(location);
        setRestaurantNameInput('');
        setRestaurantNameModalVisible(true);
      })();
    }
  }, [route]);

  const RestaurantCard = ({
    item,
    isNew,
    cardAnim,
    locationFilter,
    distance,
    handlePress,
    handleLongPress,
  }: {
    item: RestaurantWithDistance & { apimatch?: string };
    isNew: boolean;
    cardAnim: Animated.Value;
    locationFilter: { lat: number; lng: number } | null;
    distance: number | null;
    handlePress: (item: RestaurantWithDistance) => void;
    handleLongPress: (item: RestaurantWithDistance) => void;
  }) => {
    const [pressed, setPressed] = React.useState(false);
    const isCustom = item.apimatch !== 'google';
    // Animation: green->white for google, gray->white for custom
    const animatedBg = isNew
      ? cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: isCustom ? ['#e5e5e5', '#fff'] : ['#22c55e', '#fff'],
        })
      : pressed
        ? '#e5e5e5'
        : '#fff';
    const textColor = isNew
      ? cardAnim.interpolate({ inputRange: [0, 1], outputRange: ['#000', isCustom ? '#000' : '#fff'] })
      : '#000';
    return (
      <LongPressGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === GestureState.ACTIVE) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleLongPress(item);
          }
        }}
        minDurationMs={600}
      >
        <View>
          <AnimatedTouchableOpacity
            activeOpacity={0.7}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handlePress(item);
            }}
            style={[
              styles.card,
              { backgroundColor: animatedBg, borderColor: isNew ? (isCustom ? '#888' : '#22c55e') : '#000', flexDirection: 'row', alignItems: 'center' },
            ]}
          >
            {/* Always reserve space for the logo */}
            {item.apimatch === 'google' && item.brandLogo ? (
              <Image source={{ uri: item.brandLogo }} style={{ width: 28, height: 28, marginRight: 0 }} resizeMode="contain" />
            ) : (
              <View style={{ width: 28, height: 28, marginRight: 0 }} />
            )}
            <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', marginLeft: 50 }}>
              <Animated.Text style={[
                styles.name,
                { color: textColor, fontStyle: isCustom ? 'italic' : 'normal', textAlign: 'left', alignSelf: 'flex-start' }
              ]}>
                {getDisplayName(item)}
              </Animated.Text>
              {locationFilter && distance !== null && (
                <Text style={[styles.distanceText, { textAlign: 'left', alignSelf: 'flex-start' }]}> 
                  <Text style={{ fontStyle: 'italic', color: '#555' }}>{distance.toFixed(1)} miles away</Text>
                </Text>
              )}
            </View>
          </AnimatedTouchableOpacity>
        </View>
      </LongPressGestureHandler>
    );
  };

  // Crossfade from magnifier to caution when no menu is detected
  useEffect(() => {
    if (showNoMenuModal) {
      magnifierFadeAnim.setValue(1);
      cautionFadeAnim.setValue(0);
      // Show magnifier for 2.5s, then crossfade to caution for 1.2s, then fade out and go home
      const magnifierTimeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(magnifierFadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(cautionFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
        // After caution is shown for 2.5s, fade out and go home
        setTimeout(() => {
          Animated.timing(cautionFadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            setShowNoMenuModal(false);
            navigation.navigate('Home');
          });
        }, 2500);
      }, 2500);
      return () => clearTimeout(magnifierTimeout);
    }
  }, [showNoMenuModal]);

  // Success overlay: fade out overlay before navigating home
  useEffect(() => {
    if (showSuccessOverlay) {
      successOverlayAnim.setValue(1);
      const timeout = setTimeout(() => {
        Animated.timing(successOverlayAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccessOverlay(false);
          (navigation as any).navigate('Home', { fadeIn: true });
        });
      }, 1200); // Show for 1.2s, then fade out overlay
      return () => clearTimeout(timeout);
    }
  }, [showSuccessOverlay]);

  // Edit handler
  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditNameInput(restaurant.displayName || restaurant.name);
    setEditModalVisible(true);
  };

  // Submit edit
  const handleEditNameSubmit = async () => {
    if (!editingRestaurant || !editNameInput.trim()) return;
    setEditSaving(true);
    let newName = editNameInput.trim();
    try {
      await editRestaurant(
        editingRestaurant.id,
        newName
      );
      setEditModalVisible(false);
      setEditingRestaurant(null);
      setEditNameInput('');
      await fetchRestaurants();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update restaurant name.');
    } finally {
      setEditSaving(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setNetworkError(false);
    setLoading(true);
    fetchRestaurants();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Overlays should be rendered last so they are above all content */}
      {/* Main content */}
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

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff4d4d" />}
      >
        {filteredRestaurants.map((item) => {
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
          const isNew = newlyAddedRestaurantId === item.id;
          return (
            <RestaurantCard
              key={item.id}
              item={item}
              isNew={isNew}
              cardAnim={cardAnim}
              locationFilter={locationFilter}
              distance={distance}
              handlePress={handlePress}
              handleLongPress={handleLongPress}
            />
          );
        })}
        {loading && (
          <Text style={{ alignSelf: 'center', marginTop: 30 }}>Loading...</Text>
        )}
      </ScrollView>

      {/* Caution overlay for network error */}
      {networkError && !loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 90, zIndex: 1000, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)' }} pointerEvents="box-none">
          <Feather name="alert-triangle" size={64} color="#ffb3b3" />
          <Text style={{ color: '#ff4d4d', fontSize: 18, marginTop: 18, fontWeight: 'bold' }}>Network error. Pull to refresh</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.iconButton, networkError && { opacity: 0.4 }]}
            onPress={networkError ? undefined : takePhoto}
            accessibilityLabel="Add menu photo"
            disabled={networkError}
          >
            <MaterialCommunityIcons name="peanut" size={40} color="#222" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay - render last so it's above everything */}
      {showLoadingOverlay && !showNoMenuModal && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="auto">
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <AnimatedMagnifierPeanut />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32 }}>
              <Text style={{ fontSize: 22, color: '#DA291C', fontWeight: 'bold', letterSpacing: 1 }}>Finding allergens</Text>
              <AnimatedDots />
            </View>
          </View>
        </View>
      )}

      {showSuccessOverlay && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999, opacity: successOverlayAnim }]} pointerEvents="auto">
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <FadeInCheck visible={showSuccessOverlay} />
          </View>
        </Animated.View>
      )}

      {showNoMenuModal && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="auto">
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ position: 'absolute', opacity: magnifierFadeAnim }}>
              <AnimatedMagnifierPeanut />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', opacity: cautionFadeAnim }}>
              <AnimatedCaution />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      <Modal
        visible={restaurantNameModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setRestaurantNameModalVisible(false);
          setPendingImageBase64(null);
          setPendingImageUri(null);
          setPendingLocation(null);
          setRestaurantNameInput('');
          navigation.navigate('Home');
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            setRestaurantNameModalVisible(false);
            setPendingImageBase64(null);
            setPendingImageUri(null);
            setPendingLocation(null);
            setRestaurantNameInput('');
            navigation.navigate('Home');
          }}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}
            onPress={(e) => e.stopPropagation()}
          >
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
          </Pressable>
        </Pressable>
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
                style={{ backgroundColor: '#ff4d4d', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, marginRight: 8 }}
                onPress={handleDeleteRestaurant}
                disabled={deleting}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{deleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 }}
                onPress={() => {
                  setDeleteModalVisible(false);
                  if (restaurantToDelete) handleEditRestaurant(restaurantToDelete);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Restaurant Name Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#222' }}>Edit Restaurant Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginBottom: 18, fontSize: 16 }}
              placeholder="Restaurant Name"
              value={editNameInput}
              onChangeText={setEditNameInput}
              autoFocus
              editable={!editSaving}
            />
            <TouchableOpacity
              style={{ backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', opacity: editSaving ? 0.6 : 1 }}
              onPress={handleEditNameSubmit}
              disabled={editSaving}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{editSaving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Home fade-in overlay */}
      {showHomeFadeIn && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: homeFadeAnim, zIndex: 9998 }]} pointerEvents="none" />
      )}
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

// AnimatedMagnifierPeanut: magnifying glass animates in a tight circle, centered on the screen, with text below
const AnimatedMagnifierPeanut = () => {
  const [angle, setAngle] = React.useState(0);
  const iconSize = 120;
  const radius = 36; // much tighter circle
  const centerX = 0; // will use flex layout for centering
  const centerY = 0;

  React.useEffect(() => {
    let running = true;
    let start = Date.now();
    function animate() {
      if (!running) return;
      const now = Date.now();
      const t = ((now - start) % 2000) / 2000; // 2s loop
      setAngle(t * 2 * Math.PI);
      requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  // The icon will be centered in a flex container, and the circle will be relative to that center
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return (
    <View style={{ width: iconSize * 2, height: iconSize * 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -iconSize / 2 + x, marginTop: -iconSize / 2 + y }}>
        <FontAwesome5 name="search" size={iconSize} color="#DA291C" solid style={{ fontWeight: 'bold' }} />
      </View>
    </View>
  );
};

// AnimatedDots for 'Finding allergens...'
const AnimatedDots = () => {
  const [dotCount, setDotCount] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <Text style={{ color: '#DA291C', fontSize: 22, fontWeight: 'bold' }}>{'.'.repeat(dotCount)}</Text>;
};

// Restore FadeInCheck with internal animation and visible prop
const FadeInCheck = ({ visible }: { visible: boolean }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);
  return (
    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="check" size={120} color="#22c55e" style={{ fontWeight: 'bold' }} />
      <Text style={{ marginTop: 32, fontSize: 36, color: '#22c55e', fontWeight: 'bold', letterSpacing: 1 }}>Success!</Text>
    </Animated.View>
  );
};

// AnimatedCaution: yellow caution symbol with text, for no menu detected
const AnimatedCaution = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="alert-triangle" size={120} color="#FFD600" style={{ fontWeight: 'bold' }} />
      <Text style={{ marginTop: 32, fontSize: 36, color: '#FFD600', fontWeight: 'bold', letterSpacing: 1 }}>No Menu Detected</Text>
    </Animated.View>
  );
};

export default HomeScreen;