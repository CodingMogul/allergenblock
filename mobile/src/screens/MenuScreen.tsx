import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  TextInput,
  Keyboard,
  TextInput as RNTextInput,
  TouchableWithoutFeedback,
  Animated as RNAnimated,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  TapGestureHandler,
  GestureHandlerRootView,
  TapGestureHandlerEventPayload,
  GestureEvent,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  interpolate,
  useAnimatedGestureHandler,
  runOnJS,
  Extrapolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from '../../config';
import { BlurView } from 'expo-blur'; // if you want glass effect on iOS
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from './types/navigation';
import { getRestaurants } from '../storage/restaurantStorage';
import { Restaurant, MenuItem } from '../restaurantData';
import { useUserProfile } from '../context/UserProfileContext';
import { fetchGooglePlace } from '../api/googleApi';
import { fetchLogoDevUrl } from '../api/logoDevApi';
import { sharedEditRestaurant } from '../utils/editRestaurantShared';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import PeanutOutline from '../../assets/icons/PeanutOutline.svg';
import Milk from '../../assets/icons/Milk.svg';
import Eggs from '../../assets/icons/Eggs.svg';
import FishOutline from '../../assets/icons/FishOutline.svg';
import Shrimp from '../../assets/icons/Shrimp.svg';
import TreePine from '../../assets/icons/TreePine.svg';
import Bread from '../../assets/icons/Bread.svg';
import Beans from '../../assets/icons/Beans.svg';
import Sesame from '../../assets/icons/Sesame.svg';
import Carousel from 'react-native-reanimated-carousel';
import { Asset } from 'expo-asset';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AllergenId = string;

const ALLERGENS: { id: AllergenId; name: string; emoji: string }[] = [
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'eggs', name: 'Eggs', emoji: '🥚' },
  { id: 'fish', name: 'Fish', emoji: '🐟' },
  { id: 'shellfish', name: 'Shellfish', emoji: '🦐' },
  { id: 'treenuts', name: 'Tree Nuts', emoji: '🥜' },
  { id: 'peanuts', name: 'Peanuts', emoji: '🥜' },
  { id: 'gluten', name: 'Gluten', emoji: '🍞' },
  { id: 'soy', name: 'Soy', emoji: '🫘' },
  { id: 'sesame', name: 'Sesame', emoji: '✨' },
];

function getDisplayName(restaurant: any) {
  return (
    restaurant.verifiedName ||
    restaurant.restaurantName ||
    restaurant.name ||
    'Unnamed Restaurant'
  );
}

// AnimatedDots for 'Saving'
function AnimatedDots({ saving }: { saving: boolean }) {
  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    if (!saving) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [saving]);
  return <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{'.'.repeat(dotCount)}</Text>;
}

// Add getSimilarity function from HomeScreen
function getSimilarity(a: string, b: string) {
  a = a.toLowerCase().replace(/\s+/g, '');
  b = b.toLowerCase().replace(/\s+/g, '');
  if (a.includes(b) || b.includes(a)) return 100;
  const bWords = b.split(/[\s,]+/).filter(Boolean);
  let matches = 0;
  for (const word of bWords) {
    if (a.includes(word)) matches++;
  }
  return matches === bWords.length ? 90 : matches > 0 ? 70 : 0;
}

// Type the allergenIcons mapping
const allergenIcons: Record<string, React.FC<any>> = {
  peanut: PeanutOutline,
  milk: Milk,
  egg: (props) => <Eggs {...props} color="#000" />,
  eggs: (props) => <Eggs {...props} color="#000" />,
  fish: FishOutline,
  shellfish: Shrimp,
  'tree nut': TreePine,
  'tree nuts': TreePine,
  gluten: Bread,
  wheat: Bread,
  soy: Beans,
  sesame: Sesame,
};

const MODAL_CARD_WIDTH = 120;
const MODAL_CARD_HEIGHT = 140;

// Helper to get dynamic font size for the menu title
function getDynamicHeaderFontSize(title: string) {
  const baseFontSize = 30;
  const minFontSize = 18;
  // Estimate width: each char ~0.6em, so max chars for width
  const maxWidth = width - 60; // account for padding
  const estWidth = title.length * baseFontSize * 0.6;
  if (estWidth > maxWidth) {
    // Reduce font size proportionally, but not below minFontSize
    return Math.max(minFontSize, Math.floor(baseFontSize * maxWidth / estWidth));
  }
  return baseFontSize;
}

function normalizeAllergen(a: string) {
  const val = a.toLowerCase().replace(/\s|_|-/g, '');
  if (val === 'egg' || val === 'eggs') return 'egg';
  if (val === 'peanut' || val === 'peanuts') return 'peanut';
  if (val === 'treenut' || val === 'treenuts') return 'treenut';
  if (val === 'dairy' || val === 'milk') return 'dairy';
  if (val === 'gluten' || val === 'wheat') return 'gluten';
  if (val === 'shellfish' || val === 'shellfish' || val === 'shellfish') return 'shellfish';
  return val;
}

export default function MenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { restaurant } = route.params as {
    restaurant: {
      id: string;
      name: string;
      apimatch?: string;
      brandLogo?: string;
      googlePlace?: { name?: string };
      verifiedName?: string;
    };
  };
  const { profile, updateProfile } = useUserProfile();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(profile.allergens || []);
  const [saving, setSaving] = useState(false);
  const [latestRestaurant, setLatestRestaurant] = useState<typeof restaurant>(restaurant);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const searchInputRef = React.useRef<RNTextInput>(null);
  const scrollY = useSharedValue(0);
  const [locationFilter, setLocationFilter] = useState<{ lat: number; lng: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayFade = useRef(new RNAnimated.Value(0)).current;
  const [preloadedVideoUri, setPreloadedVideoUri] = useState<string | null>(null);
  const [peanutActive, setPeanutActive] = useState(false);

  const topAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 60, 180], [0, -10, -50], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 60, 180], [1, 0.7, 0], Extrapolate.CLAMP);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const onScroll = useAnimatedScrollHandler((event) => {
    // Clamp scrollY to [0, 60] to restrict pull-down and swipe-up even more
    const y = event.contentOffset.y;
    if (y < 0) {
      scrollY.value = 0;
    } else if (y > 60) {
      scrollY.value = 60;
    } else {
      scrollY.value = y;
    }
  });

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const fetchRestaurant = async () => {
        try {
          const allRestaurants: Restaurant[] = await getRestaurants();
          const found = allRestaurants.find((r: any) => r.id === restaurant.id);
          if (found && isActive) setLatestRestaurant({
            id: found.id,
            name: found.restaurantName ?? '',
            apimatch: found.apimatch,
            brandLogo: found.brandLogo,
            googlePlace: found.googlePlace,
            verifiedName: found.verifiedName,
          });
        } catch (e) {
          if (isActive) setLatestRestaurant(restaurant);
        }
      };
      fetchRestaurant();
      return () => { isActive = false; };
    }, [restaurant.id])
  );

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const fetchMenu = async () => {
        try {
          const allRestaurants: Restaurant[] = await getRestaurants();
          const found = allRestaurants.find((r: any) => r.id === restaurant.id);
          let menuItems = found && found.menuItems ? found.menuItems : [];
          // Normalize allergens
          menuItems = menuItems.map(item => ({
            ...item,
            allergens: Object.keys(item.allergenIngredients || {}),
            certainty: item.certainty,
            guessedAllergens: item.guessedAllergens,
          }));
          if (isActive) setMenu(menuItems);
        } catch (error) {
          if (isActive) setMenu([]);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchMenu();
      return () => { isActive = false; };
    }, [restaurant.id])
  );

  useEffect(() => {
    setSelectedAllergens(profile.allergens || []);
  }, [profile.allergens]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 120); // 120ms debounce
    return () => clearTimeout(handler);
  }, [searchText]);

  useEffect(() => {
    // Preload the OnboardTakePhoto.mp4 video asset for help/onboarding
    const videoModule = require('../assets/OnboardTakePhoto.mp4');
    Asset.loadAsync(videoModule).then(() => {
      const asset = Asset.fromModule(videoModule);
      setPreloadedVideoUri(asset.uri);
    });
  }, []);

  const openAllergenModal = () => {
    setSelectedAllergens(profile.allergens || []);
    setModalVisible(true);
  };

  const saveAllergens = async () => {
    await updateProfile({ allergens: selectedAllergens });
    setModalVisible(false);
  };

  // Use profile.allergens for allergen matching
  const userAllergies = Array.isArray(profile.allergens) ? profile.allergens : [];

  // Handler to open edit modal
  const handleEditRestaurantName = () => {
    setEditNameInput(latestRestaurant.verifiedName || latestRestaurant.name);
    setEditModalVisible(true);
  };

  // Handler to submit edit
  const handleEditNameSubmit = async () => {
    await sharedEditRestaurant({
      id: latestRestaurant.id,
      oldName: latestRestaurant.verifiedName || latestRestaurant.name,
      newName: editNameInput,
      setEditModalVisible,
      setEditNameInput,
      setEditSaving,
      fetchRestaurants: async () => {
        const allRestaurants: Restaurant[] = await getRestaurants();
        const found = allRestaurants.find((r: any) => r.id === latestRestaurant.id);
        if (found) setLatestRestaurant({
          id: found.id,
          name: found.restaurantName ?? '',
          apimatch: found.apimatch,
          brandLogo: found.brandLogo,
          googlePlace: found.googlePlace,
          verifiedName: found.verifiedName,
        });
        return allRestaurants;
      },
    });
  };

  // Helper to get distance in miles
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 0.621371; // miles
  }

  // Handler to get and set location
  const handleLocationPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to filter nearby restaurants.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocationFilter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      Alert.alert('Error', 'Could not get location.');
    }
  };
  const clearLocationFilter = () => setLocationFilter(null);

  // Filter and sort menu items by similarity if searchText is present
  const filteredMenu = React.useMemo(() => {
    let list = menu;
    if (locationFilter) {
      list = [...list].map(item => {
        let lat = 0;
        let lng = 0;
        const loc = (item as any).location;
        if (loc && typeof loc === 'object' && Array.isArray(loc.coordinates)) {
          lat = loc.coordinates[1] ?? 0;
          lng = loc.coordinates[0] ?? 0;
        }
        return {
          ...item,
          distance: getDistance(locationFilter.lat, locationFilter.lng, lat, lng),
        };
      }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    // Peanut button: filter out menu items with any allergen match
    if (peanutActive && Array.isArray(profile.allergens) && profile.allergens.length > 0) {
      list = list.filter(item => {
        if (!item.allergens || !Array.isArray(item.allergens)) return true;
        // If any allergen in item matches user's allergens, filter out
        return !item.allergens.some(a => profile.allergens.map(x => x.toLowerCase()).includes(a.toLowerCase()));
      });
    }
    if (!debouncedSearchText.trim()) return list;
    const search = debouncedSearchText.trim().toLowerCase();
    return [...list]
      .map(item => ({ ...item, similarity: getSimilarity(item.name, debouncedSearchText) }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }, [menu, debouncedSearchText, locationFilter, peanutActive, profile.allergens]);

  const Card = ({ item, index }: { item: MenuItem; index: number }) => {
    const isExpanded = expandedIndex === index;
    const [pressed, setPressed] = useState(false);
    // Debug log for allergen mapping
    console.log('[CARD DEBUG]', item.name, 'allergenIngredients:', item.allergenIngredients, 'allergens:', item.allergens);

    const baseCardStyle = [
      styles.menuCard,
      pressed && {
        backgroundColor: '#f0f0f0',
        transform: [{ scale: 1.02 }],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        elevation: 16,
      },
      {
        minHeight: isExpanded ? 160 : 100,
      },
      {
        flexDirection: 'row' as 'row',
        alignItems: 'center' as 'center',
        justifyContent: 'space-between' as 'space-between',
      },
    ].filter(Boolean);

    const CardContainer = ({ children }: { children: React.ReactNode }) => (
      <View style={baseCardStyle}>{children}</View>
    );

    const matchingAllergens = profile.allergens && profile.allergens.length > 0 && item.allergens
      ? item.allergens.filter(
          a => profile.allergens.map(normalizeAllergen).includes(normalizeAllergen(a))
        )
      : [];

    // Determine font size based on name length
    const nameFontSize = item.name.length > 20 ? 18 : 22;

    // Truncate name if not expanded and too long
    const MAX_NAME_LENGTH = 27;
    const isTruncated = !isExpanded && item.name.length > MAX_NAME_LENGTH;
    const displayName = isTruncated ? item.name.slice(0, MAX_NAME_LENGTH) + '…' : item.name;

    return (
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          setExpandedIndex(isExpanded ? null : index);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <CardContainer>
          <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-start' }}>
            <View style={styles.menuCardContent}>
              <View style={styles.menuTextCenterer}>
                <Text style={[styles.menuItemName, { fontFamily: 'ReadexPro-Regular', fontSize: nameFontSize }]}>
                  {isExpanded ? item.name : displayName}
                </Text>
                {/* Allergen-causing ingredients under the name */}
                {item.allergenIngredients && Object.values(item.allergenIngredients).flat().length > 0 && (
                  <Text
                    style={{ color: '#888', textAlign: 'center', fontSize: 18, fontFamily: 'ReadexPro-Regular', marginTop: 4 }}
                  >
                    {Object.values(item.allergenIngredients).flat().join(', ')}
                  </Text>
                )}
              </View>
              {/* Allergen tally icon at the right (only when not expanded) */}
              {!isExpanded && (
                <View style={{ marginRight: 4, marginLeft: 8, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 0, top: '50%', transform: [{ translateY: -14 }] }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      backgroundColor: matchingAllergens.length > 0 ? '#DA291C' : '#4CAF50',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    {matchingAllergens.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        {Array.from({ length: matchingAllergens.length }).map((_, i) => (
                          <View
                            key={i}
                            style={{
                              width: 4,
                              height: 16,
                              borderRadius: 2,
                              backgroundColor: '#fff',
                              marginHorizontal: 1,
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
            {/* Allergen badges row at the bottom when expanded */}
            {isExpanded && matchingAllergens.length > 0 && (
              <View style={[styles.allergenListContainer, { marginTop: 'auto' }]}> 
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  {matchingAllergens.map((allergen, i) => {
                    let key = allergen.toLowerCase().trim();
                    if (key === 'peanuts') key = 'peanut';
                    if (key === 'treenuts') key = 'tree nuts';
                    if (key === 'eggs' || key === 'egg') key = 'eggs';
                    if (key === 'shellfish') key = 'shellfish';
                    if (key === 'dairy' || key === 'milk') key = 'milk';
                    if (key === 'gluten' || key === 'wheat') key = 'gluten';
                    if (key === 'soy') key = 'soy';
                    if (key === 'sesame') key = 'sesame';
                    const Icon = allergenIcons[key as keyof typeof allergenIcons];
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffeaea', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 4 }}>
                        {Icon ? <Icon width={20} height={20} style={{ marginRight: 4 }} /> : null}
                        <Text style={{ color: '#DA291C', fontWeight: 'bold', fontFamily: 'ReadexPro-Bold', fontSize: 15 }}>{allergen}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </CardContainer>
      </Pressable>
    );
  };

  const listHeader = useMemo(() => (
    <>
      <Animated.View style={topAnimatedStyle}>
        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 125 }}>
          {latestRestaurant.brandLogo && (
            <View style={{ width: 64, height: 64, marginBottom: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}>
              <Image source={{ uri: latestRestaurant.brandLogo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          )}
          <Pressable
            onLongPress={handleEditRestaurantName}
            delayLongPress={500}
            style={{ width: '100%' }}
          >
            <Text style={[styles.header, { fontSize: getDynamicHeaderFontSize(getDisplayName(latestRestaurant)) }]}>
              {getDisplayName(latestRestaurant)}
            </Text>
          </Pressable>
          {/* Always show search bar */}
          <View style={{
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
            marginTop: 10,
            marginRight: 10,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 28,
              height: 56,
              flex: 1,
              maxWidth: 340,
              paddingLeft: 20,
              paddingRight: 0,
              shadowColor: '#000',
              shadowOpacity: 0.03,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }}>
              {searchText.length === 0 ? (
                <FontAwesome name="search" size={28} color="#DA291C" style={{ marginRight: 12 }} />
              ) : (
                <TouchableOpacity onPress={() => setSearchText('')} accessibilityLabel="Clear search text" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x-circle" size={24} color="#000" style={{ marginRight: 12 }} />
                </TouchableOpacity>
              )}
              <RNTextInput
                ref={searchInputRef}
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontFamily: 'ReadexPro-Regular',
                  color: '#222',
                  backgroundColor: 'transparent',
                  height: 56,
                }}
                placeholder="Search menu items"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              onPress={() => setPeanutActive((prev) => !prev)}
              style={{
                marginLeft: 12,
                borderRadius: 28,
                width: 48,
                height: 48,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: peanutActive ? '#DA291C' : '#fff',
                borderWidth: peanutActive ? 2 : 0,
                borderColor: peanutActive ? '#fff' : 'transparent',
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
              accessibilityLabel="Peanut placeholder"
            >
              <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path
                  d="M12 2c2.5 0 5 2 5 5c0 1.13 -0.37 2.16 -1 3c-0.28 0.38 -0.5 1 -0.5 1.5c0 0.5 0.2 0.91 0.5 1.23c0.93 0.98 1.5 2.31 1.5 3.77c0 3.04 -2.46 5.5 -5.5 5.5c-3.04 0 -5.5 -2.46 -5.5 -5.5c0 -1.46 0.57 -2.79 1.5 -3.77c0.3 -0.32 0.5 -0.73 0.5 -1.23c0 -0.5 -0.22 -1.12 -0.5 -1.5c-0.63 -0.84 -1 -1.87 -1 -3c0 -2.76 2 -5 5 -5Z"
                  stroke={peanutActive ? '#fff' : '#DA291C'}
                  strokeWidth={2}
                  fill="none"
                />
                <G transform="rotate(45 12 12)">
                  <Path
                    d="M-1 11h24"
                    stroke={peanutActive ? '#fff' : '#DA291C'}
                    strokeWidth={2}
                    fill="none"
                  />
                </G>
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  ), [topAnimatedStyle, latestRestaurant, handleEditRestaurantName, searchText, peanutActive]);

  const handleHomePress = () => {
    setShowOverlay(true);
    // Start overlay fade-in
    RNAnimated.timing(overlayFade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    // Immediately reset navigation stack
    console.log('---NAVIGATION LOG--- Navigating from MenuScreen to HomeScreen');
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const buttonFadeStyle = useAnimatedStyle(() => {
    // Fade out as scrollY goes from 0 to 30, fully hidden at 30+
    const opacity = interpolate(scrollY.value, [0, 30], [1, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
      }}
      accessible={false}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* White fade overlay for transition */}
        {showOverlay && (
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#fff',
              opacity: overlayFade,
              zIndex: 999,
            }}
          />
        )}
        <Animated.View style={[styles.homeButtonLeft, buttonFadeStyle]} pointerEvents={undefined}>
          <TouchableOpacity
            onPress={handleHomePress}
            accessibilityLabel="Go to Home"
          >
            <FontAwesome name="home" size={30} color="#DA291C" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.profileButtonRight, buttonFadeStyle]} pointerEvents={undefined}>
          <TouchableOpacity
            onPress={openAllergenModal}
            accessibilityLabel="Profile"
          >
            <FontAwesome name="user" size={30} color="#DA291C" />
          </TouchableOpacity>
        </Animated.View>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Allergens</Text>
              <View style={styles.modalAllergenGrid}>
                {Array.from({ length: Math.ceil(ALLERGENS.length / 3) }).map((_, rowIdx, rowArr) => (
                  <View
                    key={rowIdx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      width: '100%',
                      marginBottom: rowIdx < rowArr.length - 1 ? 14 : 0,
                    }}
                  >
                    {ALLERGENS.slice(rowIdx * 3, rowIdx * 3 + 3).map((allergen) => {
                      let iconKey = allergen.id.toLowerCase();
                      if (iconKey === 'peanuts') iconKey = 'peanut';
                      if (iconKey === 'treenuts') iconKey = 'tree nuts';
                      if (iconKey === 'eggs' || iconKey === 'egg') iconKey = 'eggs';
                      if (iconKey === 'shellfish') iconKey = 'shellfish';
                      if (iconKey === 'dairy' || iconKey === 'milk') iconKey = 'milk';
                      if (iconKey === 'gluten' || iconKey === 'wheat') iconKey = 'gluten';
                      if (iconKey === 'soy') iconKey = 'soy';
                      if (iconKey === 'sesame') iconKey = 'sesame';
                      const Icon = allergenIcons[iconKey];
                      return (
                        <TouchableOpacity
                          key={allergen.id}
                          style={[
                            styles.modalAllergenButton,
                            { marginHorizontal: 10 },
                            selectedAllergens.includes(allergen.id) && styles.modalAllergenButtonSelected
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedAllergens((current) =>
                              (current as string[]).includes(allergen.id)
                                ? (current as string[]).filter(id => id !== allergen.id)
                                : [...(current as string[]), allergen.id]
                            );
                          }}
                        >
                          {Icon && <Icon width={24} height={24} style={{ marginBottom: 2 }} />}
                          <Text style={styles.modalAllergenText}>{allergen.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveAllergens}
                disabled={saving}
              >
                <Text style={styles.modalSaveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
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
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginBottom: 18, fontSize: 16, fontFamily: 'Inter-Regular' }}
                placeholder="Restaurant Name"
                value={editNameInput}
                onChangeText={setEditNameInput}
                autoFocus
                editable={!editSaving}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#DA291C', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', opacity: editSaving ? 0.6 : 1 }}
                onPress={handleEditNameSubmit}
                disabled={editSaving}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter-Bold' }}>
                  {editSaving ? <>Saving<AnimatedDots saving={editSaving} /></> : 'Save'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {loading ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
        ) : (
          <Animated.FlatList
            data={filteredMenu}
            renderItem={({ item, index }) => <Card item={item} index={index} />}
            keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
            contentContainerStyle={styles.scrollView}
            onScroll={onScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={listHeader}
          />
        )}
      </GestureHandlerRootView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'center',
    fontFamily: 'ReadexPro-Bold',
  },
  scrollView: {
    width: '100%',
    padding: 20,
    paddingTop: 36,
  },

  menuCard: {
    width: width - 48,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  

  menuCardContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  menuTextCenterer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  menuItemName: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 0,
    fontFamily: 'ReadexPro-Regular',
  },
  menuItemAllergensCount: {
    fontSize: 12,
    color: '#ff4d4d', // defined red
    marginTop: -20,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'ReadexPro-Regular',
  },
  allergenListContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuItemAllergensExpanded: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'ReadexPro-Regular',
  },
  homeButtonLeft: {
    position: 'absolute',
    top: 80,
    left: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  profileButtonRight: {
    position: 'absolute',
    top: 80,
    right: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
    fontFamily: 'ReadexPro-Bold',
  },
  modalAllergenGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAllergenButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  modalAllergenButtonSelected: {
    backgroundColor: '#ffeaea',
  },
  modalAllergenText: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'ReadexPro-Regular',
  },
  modalSaveButton: {
    backgroundColor: '#DA291C',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
  },
  iconContainer: {
    marginLeft: 'auto',
    padding: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});