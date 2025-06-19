// ✅ HomeScreen.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BASE_URL } from "../../config";
import {
  TapGestureHandler,
  TapGestureHandlerEventPayload,
  GestureEvent,
  LongPressGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import {
  MaterialIcons,
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Easing } from "react-native";
import * as Haptics from "expo-haptics";
import {
  deleteRestaurant,
  editRestaurant,
  getRestaurants,
  addRestaurant,
} from "../storage/restaurantStorage";
import { fetchGooglePlace } from "../api/googleApi";
import { fetchLogoDevUrl } from "../api/logoDevApi";
import uuid from "react-native-uuid";
import type { MenuItem, Restaurant } from "../restaurantData";
import { Accelerometer } from "expo-sensors";
import { LinearGradient } from "expo-linear-gradient";
import type { TextInput as RNTextInput } from "react-native";
import { RootStackParamList } from "../screens/types/navigation";
import { Asset } from "expo-asset";
import Svg, { Path } from "react-native-svg";
import MenuSvg from "../../assets/icons/menu.svg";
import { Animated as RNAnimated } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

type RestaurantWithDistance = Restaurant & {
  distance?: number;
  similarity?: number;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getSimilarity(a: string, b: string) {
  a = a.toLowerCase().replace(/\s+/g, "");
  b = b.toLowerCase().replace(/\s+/g, "");
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
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to compute distance between two lat/lng points in meters
function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Update getGoogleMatchedName to return both name and location if matched
async function getGoogleMatchedNameAndLocation(
  inputName: string,
  location: { lat: number; lng: number }
) {
  try {
    const params = new URLSearchParams({
      restaurantName: inputName,
      lat: String(location.lat),
      lng: String(location.lng),
    });
    const res = await fetch(`${BASE_URL}/api/maps?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (
        data.apimatch === "google" &&
        data.googlePlace &&
        data.googlePlace.name &&
        data.googlePlace.location
      ) {
        return {
          name: data.googlePlace.name,
          location: data.googlePlace.location,
        };
      }
    }
  } catch {}
  return { name: inputName, location };
}

function createRestaurantFromGemini(
  data: any,
  restaurantName: string,
  location: { lat: number; lng: number }
): Restaurant {
  return {
    id: uuid.v4(),
    restaurantName: data.restaurantName || restaurantName,
    location: {
      type: "Point" as const,
      coordinates: [
        (data.location && data.location.lng) || location.lng,
        (data.location && data.location.lat) || location.lat,
      ],
    },
    menuItems: data.menuItems || [],
    source: data.source || "camera",
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
    "Unnamed Restaurant"
  );
}

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantNameModalVisible, setRestaurantNameModalVisible] =
    useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(
    null
  );
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [restaurantNameInput, setRestaurantNameInput] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] =
    useState<Restaurant | null>(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastInitial, setUserLastInitial] = useState("");
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [newlyAddedRestaurantId, setNewlyAddedRestaurantId] = useState<
    string | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [googleMatchedName, setGoogleMatchedName] = useState<string | null>(
    null
  );
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showNoMenuModal, setShowNoMenuModal] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [cardAnim] = React.useState(new RNAnimated.Value(0));
  const noMenuFadeAnim = React.useRef(new RNAnimated.Value(1)).current;
  const magnifierFadeAnim = React.useRef(new RNAnimated.Value(1)).current;
  const cautionFadeAnim = React.useRef(new RNAnimated.Value(0)).current;
  // Success overlay animation values
  const successMagnifierFadeAnim = React.useRef(
    new RNAnimated.Value(1)
  ).current;
  const successCheckFadeAnim = React.useRef(new RNAnimated.Value(0)).current;
  const [showHomeFadeIn, setShowHomeFadeIn] = useState(false);
  const homeFadeAnim = useRef(new RNAnimated.Value(0)).current;
  const [successOverlayAnim] = useState(new RNAnimated.Value(1));
  // Add state for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null
  );
  const [editSaving, setEditSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  // Add state for delete confirmation modal
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [lastDeletedRestaurant, setLastDeletedRestaurant] =
    useState<Restaurant | null>(null);
  const [cautionModalVisible, setCautionModalVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  // Ensure searchInputRef is defined for the search bar
  const searchInputRef = useRef<RNTextInput | null>(null);
  const [preloadedVideoUri, setPreloadedVideoUri] = useState<string | null>(
    null
  );
  const { width: windowWidth } = useWindowDimensions();

  const AnimatedTouchableOpacity =
    RNAnimated.createAnimatedComponent(TouchableOpacity);

  // Use React state for scrollY (for fade effect)
  const [scrollY, setScrollY] = useState(0);

  const SCREEN_EDGE_IGNORE_PX = 20;
  const SCREEN_RIGHT_EDGE_IGNORE_PX = 20;
  const [cardWidth, setCardWidth] = useState(0);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

  // Add state for delete modal position
  const [deleteModalPosition, setDeleteModalPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Fetch restaurants function (moved outside useEffect for reuse)
  const fetchRestaurants = async () => {
    setNetworkError(false);
    setLoading(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
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
        const profile = await AsyncStorage.getItem("userProfile");
        if (profile) {
          const { firstName, lastName } = JSON.parse(profile);
          setUserFirstName(firstName || "");
          setUserLastInitial(
            lastName && lastName.length > 0 ? lastName[0].toUpperCase() : ""
          );
        }
      } catch {}
    };
    loadUserName();
  }, []);

  const handlePress = (
    restaurant: RestaurantWithDistance & {
      apimatch?: string;
      brandLogo?: string;
    }
  ) => {
    navigation.navigate("Menu", {
      restaurant: {
        id: restaurant.id,
        name: restaurant.restaurantName,
        apimatch: (restaurant as any).apimatch,
        brandLogo: (restaurant as any).brandLogo,
      },
    });
  };

  const filteredRestaurants: RestaurantWithDistance[] = useMemo(() => {
    let list: RestaurantWithDistance[] = restaurants.filter(
      (r) => !(r as any).hidden
    );
    let bestHiddenMatch: RestaurantWithDistance | null = null;
    if (debouncedSearchText.trim()) {
      // Find the best matching hidden restaurant
      const hiddenRestaurants = restaurants.filter((r) => (r as any).hidden);
      let bestScore = -1;
      hiddenRestaurants.forEach((r) => {
        const similarity = getSimilarity(r.restaurantName, debouncedSearchText);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestHiddenMatch = { ...r, similarity };
        }
      });
      // If the best hidden match is reasonably similar, show it at the top
      if (bestHiddenMatch && bestScore >= 70) {
        list = [
          bestHiddenMatch,
          ...list.filter((r) => r.id !== bestHiddenMatch!.id),
        ];
      }
      // Reorder by similarity, do not filter out
      const search = debouncedSearchText.trim().toLowerCase();
      list = [...list]
        .map((r) => ({
          ...r,
          similarity: getSimilarity(r.restaurantName, search),
        }))
        .sort((a, b) => b.similarity - a.similarity);
      // If user location is available, filter Google-matched restaurants to within 10 miles
      if (locationFilter) {
        list = list.filter((r) => {
          if (r.apimatch === "google" && r.location && r.location.coordinates) {
            const lat = r.location.coordinates[1] ?? 0;
            const lng = r.location.coordinates[0] ?? 0;
            const dist =
              getDistance(locationFilter.lat, locationFilter.lng, lat, lng) *
              0.621371; // km to miles
            return dist <= 10;
          }
          return true;
        });
      }
    } else if (locationFilter) {
      // If location filter is active, sort by distance only (do not filter by distance)
      list = list
        .map((r) => {
          const lat = r.location?.coordinates?.[1] ?? 0;
          const lng = r.location?.coordinates?.[0] ?? 0;
          if (locationFilter) {
            return {
              ...r,
              distance: getDistance(
                locationFilter.lat,
                locationFilter.lng,
                lat,
                lng
              ),
            };
          }
          return { ...r, distance: Infinity };
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    return list;
  }, [restaurants, debouncedSearchText, locationFilter]);

  const uploadMenuImage = async (
    base64: string,
    restaurantName: string,
    location: { lat: number; lng: number }
  ) => {
    try {
      // Call backend for Gemini processing
      const response = await fetch(`${BASE_URL}/api/upload-menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const googleResult = await fetchGooglePlace(restaurantName, location);
        let verifiedName = restaurantName;
        let verifiedLocation = location;
        let googlePlace = undefined;
        let apimatch = "none";
        if (
          googleResult &&
          googleResult.apimatch === "google" &&
          googleResult.googlePlace
        ) {
          verifiedName = googleResult.googlePlace.name;
          verifiedLocation = googleResult.googlePlace.location;
          googlePlace = googleResult.googlePlace;
          apimatch = "google";
        }
        // 2. logo.dev for logo (only if apimatch is 'google')
        let brandLogo = "";
        if (apimatch === "google") {
          brandLogo = (await fetchLogoDevUrl(verifiedName, verifiedName)) || "";
        }
        // 3. Save to AsyncStorage with all info
        const newRestaurant = {
          id: uuid.v4(),
          restaurantName: restaurantName,
          verifiedName,
          displayName: verifiedName,
          name: verifiedName,
          location: {
            type: "Point" as const,
            coordinates: [
              verifiedLocation.lng ?? 0,
              verifiedLocation.lat ?? 0,
            ] as [number, number],
          },
          verifiedLocation,
          menuItems: menuItems,
          source: data.source || "camera",
          apimatch,
          googlePlace,
          brandLogo: brandLogo || "",
          updatedAt: Date.now(),
          createdAt: Date.now(),
          hidden: false,
        };
        await addRestaurant(newRestaurant);
        console.log("Saved restaurant:", newRestaurant);
        setShowLoadingOverlay(false);
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
          InteractionManager.runAfterInteractions(() => {
            fetchRestaurants().then((list) => {
              const newCard = list.find((r) => r.id === newRestaurant.id);
              if (newCard) {
                setNewlyAddedRestaurantId(newCard.id);
                RNAnimated.sequence([
                  RNAnimated.timing(cardAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: false,
                  }),
                  RNAnimated.delay(1000),
                  RNAnimated.timing(cardAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: false,
                  }),
                ]).start(() => {
                  requestAnimationFrame(() => setNewlyAddedRestaurantId(null));
                });
              }
            });
          });
        }, 900);
      } else {
        console.log("Processing or upload failed:", data);
        setShowLoadingOverlay(false);
        setShowSuccessOverlay(false);
        setShowNoMenuModal(true);
      }
    } catch (err: any) {
      console.log("Error uploading image:", err);
      Alert.alert("Error", "Error uploading image: " + err.message);
    }
  };

  const handleImageSelected = async (uri: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    let location = locationFilter;
    if (!location) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setLocationFilter(location);
      } else {
        location = { lat: 0, lng: 0 };
      }
    }
    setPendingImageBase64(base64);
    setPendingImageUri(uri);
    setPendingLocation(location);
    setRestaurantNameInput("");
    setRestaurantNameModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      await handleImageSelected(result.assets[0].uri);
    }
  };

  const takePhoto = () => {
    navigation.navigate("Camera");
  };

  const handleRestaurantNameSubmit = async () => {
    if (!restaurantNameInput.trim()) {
      Alert.alert("Please enter a restaurant name.");
      return;
    }
    setRestaurantNameModalVisible(false);
    setShowLoadingOverlay(true);
    if (pendingImageBase64 && pendingLocation) {
      // Get Google-matched name and location before upload
      const googleResult = await getGoogleMatchedNameAndLocation(
        restaurantNameInput.trim(),
        pendingLocation
      );
      let useName = googleResult.name;
      let useLocation = pendingLocation;
      if (googleResult.location) {
        const dist = getDistanceMeters(
          pendingLocation.lat,
          pendingLocation.lng,
          googleResult.location.lat,
          googleResult.location.lng
        );
        // Use Google location if within 500 meters
        if (dist < 500) {
          useLocation = googleResult.location;
        }
      }
      // Upload and handle response
      await uploadMenuImage(pendingImageBase64, useName, useLocation);
      setPendingImageBase64(null);
      setPendingImageUri(null);
      setPendingLocation(null);
      setRestaurantNameInput("");
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
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location permission is required to filter nearby restaurants."
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocationFilter({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch (err: any) {
      Alert.alert("Error", "Could not get location: " + err.message);
    }
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
  };

  const goToProfileSetup = () => {
    navigation.navigate("ProfileSetup", { canGoBack: true });
  };

  const handleLongPress = (
    restaurant: Restaurant,
    layout: { x: number; y: number; width: number; height: number } | null
  ) => {
    setRestaurantToDelete(restaurant);
    setDeleteModalVisible(true);
    setDeleteModalPosition(layout);
  };

  // Fade-in effect when navigating home after success
  useEffect(() => {
    if ((route as any).params?.fadeIn) {
      setShowHomeFadeIn(true);
      RNAnimated.timing(homeFadeAnim, {
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
        await handleImageSelected(photoUri);
        // Reset the param so this effect can fire again for new photos
        navigation.setParams({ photoUri: undefined });
      })();
    }
  }, [route]);

  useEffect(() => {
    // Preload the OnboardTakePhoto.mp4 video asset for help/onboarding
    const videoModule = require("../assets/OnboardTakePhoto.mp4");
    Asset.loadAsync(videoModule).then(() => {
      const asset = Asset.fromModule(videoModule);
      setPreloadedVideoUri(asset.uri);
    });
  }, []);

  // Helper to get dynamic font size for title
  function getDynamicTitleFontSize(title: string) {
    const baseFontSize = 54;
    const minFontSize = 32;
    // Estimate width: each char ~0.6em, so max chars for width
    const maxWidth = windowWidth - 40;
    const estWidth = title.length * baseFontSize * 0.6;
    if (estWidth > maxWidth) {
      // Reduce font size proportionally, but not below minFontSize
      return Math.max(
        minFontSize,
        Math.floor((baseFontSize * maxWidth) / estWidth)
      );
    }
    return baseFontSize;
  }

  const SWIPE_LOCK_PX = 72;

  const RestaurantCard = ({
    item,
    isNew,
    cardAnim,
    locationFilter,
    distance,
    handlePress,
    handleLongPress,
    onDelete,
    openSwipeId,
    setOpenSwipeId,
    selectedId,
  }: {
    item: RestaurantWithDistance & { apimatch?: string };
    isNew: boolean;
    cardAnim: RNAnimated.Value;
    locationFilter: { lat: number; lng: number } | null;
    distance: number | null;
    handlePress: (item: RestaurantWithDistance) => void;
    handleLongPress: (
      item: RestaurantWithDistance,
      layout: { x: number; y: number; width: number; height: number } | null
    ) => void;
    onDelete: (item: RestaurantWithDistance) => void;
    openSwipeId: string | null;
    setOpenSwipeId: (id: string | null) => void;
    selectedId: string | null;
  }) => {
    const [pressed, setPressed] = React.useState(false);
    const swipeableRef = useRef(null);
    const cardRef = useRef(null);
    // Animation: green->white for google, gray->white for custom
    const animatedBg = isNew
      ? cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange:
            item.apimatch !== "google"
              ? ["#fff", "#e5e5e5"]
              : ["#fff", "#22c55e"],
        })
      : pressed
      ? "#f0f0f0"
      : "#fff";
    const textColor = isNew
      ? cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["#000", item.apimatch !== "google" ? "#000" : "#fff"],
        })
      : "#000";
    const lat = item.location?.coordinates?.[1] ?? 0;
    const lng = item.location?.coordinates?.[0] ?? 0;
    // Dynamic font size for restaurant name
    function getDynamicNameFontSize(name: string) {
      const baseFontSize = 26;
      const minFontSize = 16;
      const maxWidth = windowWidth - 180; // account for padding/logo
      const estWidth = name.length * baseFontSize * 0.6;
      if (estWidth > maxWidth) {
        return Math.max(
          minFontSize,
          Math.floor((baseFontSize * maxWidth) / estWidth)
        );
      }
      return baseFontSize;
    }
    // Render right action for swipeable
    const renderRightActions = (progress, dragX) => {
      // Icons move in sync with card swipe
      const iconTranslate = dragX.interpolate({
        inputRange: [-SWIPE_LOCK_PX, 0],
        outputRange: [0, SWIPE_LOCK_PX],
        extrapolate: "clamp",
      });
      return (
        <RNAnimated.View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            height: "100%",
            backgroundColor: "transparent",
            transform: [{ translateX: iconTranslate }],
            width: SWIPE_LOCK_PX + 72,
            overflow: "visible",
          }}
        >
          <TouchableOpacity
            onPress={async () => {
              await onDelete(item);
            }}
            style={{
              width: 56,
              height: 56,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 8,
              marginTop: 4,
              marginBottom: 35,
              backgroundColor: "transparent",
            }}
            accessibilityLabel="Delete restaurant"
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={28} color="#DA291C" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleEditRestaurant(item);
            }}
            style={{
              width: 56,
              height: 56,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 8,
              marginTop: 4,
              marginBottom: 35,
              backgroundColor: "transparent",
            }}
            accessibilityLabel="Edit restaurant"
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={28} color="#000" />
          </TouchableOpacity>
        </RNAnimated.View>
      );
    };
    // Clamp card translationX to -10px
    const renderCardContent = () => (
      <LongPressGestureHandler
        simultaneousHandlers={swipeableRef}
        onHandlerStateChange={({ nativeEvent }: { nativeEvent: any }) => {
          if (nativeEvent.state === GestureState.ACTIVE) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Get card position on long press
            if (cardRef.current) {
              (cardRef.current as any).measureInWindow(
                (x: number, y: number, width: number, height: number) => {
                  handleLongPress(item, { x, y, width, height });
                }
              );
            } else {
              handleLongPress(item, null);
            }
            setOpenSwipeId(null);
          }
        }}
        minDurationMs={600}
      >
        <View ref={cardRef}>
          <AnimatedTouchableOpacity
            activeOpacity={0.7}
            onPressIn={() => {
              setPressed(true);
              setOpenSwipeId(null);
            }}
            onPressOut={() => setPressed(false)}
            onPress={() => {
              handlePress(item);
              setOpenSwipeId(null);
            }}
            style={[
              styles.card,
              {
                backgroundColor: pressed ? "#f0f0f0" : "#fff",
                transform: pressed ? [{ scale: 1.04 }] : [],
                shadowOffset: pressed
                  ? { width: 0, height: 4 }
                  : { width: 0, height: 4 },
                shadowOpacity: pressed ? 0.13 : 0.1,
                shadowRadius: pressed ? 10 : 8,
                elevation: pressed ? 8 : 6,
                minHeight: 120,
                paddingVertical: 28,
                paddingHorizontal: 32,
              },
              { flexDirection: "row", alignItems: "center" },
            ]}
          >
            {/* Overlay for selected card */}
            {selectedId === item.id && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0,0,0,0.18)",
                  borderRadius: 24,
                  zIndex: 10,
                }}
                pointerEvents="none"
              />
            )}
            {/* Only show logo for Google-matched cards */}
            {item.apimatch === "google" && item.brandLogo ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  marginRight: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <Image
                  source={{ uri: item.brandLogo }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={{ width: 36, height: 36, marginRight: 0 }} />
            )}
            <View
              style={{
                flex: 1,
                alignItems: "flex-start",
                justifyContent: "center",
                marginLeft: 60,
              }}
            >
              <RNAnimated.Text
                style={[
                  styles.name,
                  {
                    color: textColor,
                    textAlign: "left",
                    alignSelf: "flex-start",
                    fontWeight: "bold",
                    fontFamily: "ReadexPro-Bold",
                    fontSize: getDynamicNameFontSize(getDisplayName(item)),
                  },
                ]}
              >
                {getDisplayName(item)}
              </RNAnimated.Text>
              {locationFilter && distance !== null && (
                <Text
                  style={[
                    styles.distanceText,
                    { textAlign: "left", alignSelf: "flex-start" },
                  ]}
                >
                  <Text style={{ fontStyle: "italic", color: "#555" }}>
                    {distance.toFixed(1)} miles away
                  </Text>
                </Text>
              )}
            </View>
          </AnimatedTouchableOpacity>
        </View>
      </LongPressGestureHandler>
    );
    // Lock open at 10px, haptic feedback only once, only one open at a time
    const handleSwipeableOpen = () => {
      setOpenSwipeId(item.id);
      if (swipeableRef.current) {
        swipeableRef.current.openRight();
      }
    };
    useEffect(() => {
      if (openSwipeId !== item.id && swipeableRef.current) {
        swipeableRef.current.close();
      }
    }, [openSwipeId]);
    const isSelected = selectedId === item.id;
    return (
      <View onLayout={handleCardLayout} onTouchStart={handleTouchStart}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          rightThreshold={SWIPE_LOCK_PX}
          leftThreshold={40}
          friction={0.7}
          overshootRight={false}
          onSwipeableRightOpen={handleSwipeableOpen}
          containerStyle={{
            marginBottom: 28,
            backgroundColor: "transparent",
            overflow: "visible",
          }}
          childrenContainerStyle={undefined}
          dragOffsetFromRightEdge={SWIPE_LOCK_PX}
          useNativeAnimations={true}
          enabled={swipeEnabled}
        >
          {renderCardContent()}
        </Swipeable>
      </View>
    );
  };

  // Crossfade from magnifier to caution when no menu is detected
  useEffect(() => {
    if (showNoMenuModal) {
      RNAnimated.timing(magnifierFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      RNAnimated.timing(cautionFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
      // Show magnifier for 2.5s, then crossfade to caution for 1.2s, then fade out and go home
      const magnifierTimeout = setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(magnifierFadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(cautionFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
        // After caution is shown for 2.5s, fade out and go home
        setTimeout(() => {
          RNAnimated.timing(cautionFadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            setShowNoMenuModal(false);
            navigation.navigate("Home");
          });
        }, 2500);
      }, 2500);
      return () => clearTimeout(magnifierTimeout);
    }
  }, [showNoMenuModal]);

  // Success overlay: fade out overlay before navigating home
  useEffect(() => {
    if (showSuccessOverlay) {
      RNAnimated.timing(successOverlayAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      const timeout = setTimeout(() => {
        RNAnimated.timing(successOverlayAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccessOverlay(false);
          (navigation as any).navigate("Home", { fadeIn: true });
        });
      }, 1200); // Show for 1.2s, then fade out overlay
      return () => clearTimeout(timeout);
    }
  }, [showSuccessOverlay]);

  // Edit handler
  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditNameInput(restaurant.verifiedName || restaurant.restaurantName);
    setEditModalVisible(true);
  };

  // Submit edit
  const handleEditNameSubmit = async () => {
    if (!editingRestaurant || !editNameInput.trim()) return;
    setEditSaving(true);
    let newName = editNameInput.trim();

    // 1. Always get user's current location for Google API match
    let location = { lat: 0, lng: 0 };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {}

    // 2. Google API match for name/location (same as uploadMenuImage)
    const googleResult = await fetchGooglePlace(newName, location);
    let verifiedName = newName;
    let verifiedLocation = location;
    let googlePlace = undefined;
    let apimatch = "none";
    if (
      googleResult &&
      googleResult.apimatch === "google" &&
      googleResult.googlePlace
    ) {
      verifiedName = googleResult.googlePlace.name;
      verifiedLocation = googleResult.googlePlace.location;
      googlePlace = googleResult.googlePlace;
      apimatch = "google";
    }
    // 3. logo.dev for logo (only if apimatch is 'google')
    let brandLogo = "";
    if (apimatch === "google") {
      brandLogo = (await fetchLogoDevUrl(verifiedName, verifiedName)) || "";
    }

    // Debug logging before saving
    console.log("[Edit Debug] googleResult:", googleResult);
    console.log(
      "[Edit Debug] apimatch:",
      apimatch,
      "verifiedName:",
      verifiedName,
      "verifiedLocation:",
      verifiedLocation,
      "googlePlace:",
      googlePlace,
      "brandLogo:",
      brandLogo
    );
    if (apimatch !== "google") {
      console.warn(
        "[Edit Debug] WARNING: apimatch is not google. This edit will be saved as custom."
      );
    }

    try {
      await editRestaurant(
        editingRestaurant.id,
        newName,
        verifiedName,
        verifiedLocation,
        apimatch,
        googlePlace,
        brandLogo || "",
        verifiedLocation
      );
      setEditModalVisible(false);
      setEditingRestaurant(null);
      setEditNameInput("");
      // Debug: log restaurants after fetch
      const updatedList = await fetchRestaurants();
      const updatedRestaurant = updatedList.find(
        (r) => r.id === editingRestaurant.id
      );
      console.log("[Edit] Updated restaurant:", updatedRestaurant);
      // Add a buffer before animating to ensure state is updated and avoid glitches
      setTimeout(() => {
        setNewlyAddedRestaurantId(editingRestaurant.id);
        RNAnimated.sequence([
          RNAnimated.timing(cardAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          RNAnimated.delay(1000),
          RNAnimated.timing(cardAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
        ]).start(() => {
          requestAnimationFrame(() => setNewlyAddedRestaurantId(null));
        });
      }, 200); // 200ms buffer
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update restaurant name.");
    } finally {
      setEditSaving(false);
      setTimeout(() => {
        closeAllModals();
        console.log("DEBUG overlay states after edit:", {
          showLoadingOverlay,
          showSuccessOverlay,
          showNoMenuModal,
          showHomeFadeIn,
          cautionModalVisible,
          editModalVisible,
          deleteModalVisible,
          confirmDeleteVisible,
        });
      }, 1000);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setNetworkError(false);
    setLoading(true);
    fetchRestaurants();
  }, []);

  // Add this helper function inside HomeScreen
  function closeAllModals() {
    setEditModalVisible(false);
    setDeleteModalVisible(false);
    setConfirmDeleteVisible(false);
    setShowLoadingOverlay(false);
    setShowSuccessOverlay(false);
    setShowNoMenuModal(false);
    setRestaurantToDelete(null);
  }

  // Animated fade for help/profile buttons and title
  const buttonFade = scrollY <= 0 ? 1 : scrollY >= 70 ? 0 : 1 - scrollY / 70;
  const buttonFadeStyle = { opacity: buttonFade };

  const listHeader = useMemo(
    () => (
      <>
        {restaurants.length > 0 && (
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              alignSelf: "center",
              marginTop: 140,
              marginBottom: 40,
              flexDirection: "row",
              alignItems: "center",
              zIndex: 100,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 28,
                height: 56,
                paddingLeft: 20,
                paddingRight: 0,
                flex: 1,
                minWidth: 0,
                shadowColor: "#000",
                shadowOpacity: 0.07,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              {searchBarVisible ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText("");
                    setSearchBarVisible(false);
                  }}
                  accessibilityLabel="Clear search text"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name="x-circle"
                    size={24}
                    color="#000"
                    style={{ marginRight: 12 }}
                  />
                </TouchableOpacity>
              ) : (
                <FontAwesome
                  name="search"
                  size={28}
                  color="#DA291C"
                  style={{ marginRight: 12 }}
                />
              )}
              <TextInput
                ref={(ref) => {
                  searchInputRef.current = ref;
                  if (ref) console.log("[DEBUG] searchInputRef set", ref);
                }}
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontFamily: "ReadexPro-Regular",
                  color: "#222",
                  backgroundColor: "transparent",
                  height: 56,
                }}
                placeholder="Search restaurants"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onFocus={() => setSearchBarVisible(true)}
                onBlur={() => {
                  if (!searchText) setSearchBarVisible(false);
                }}
              />
            </View>
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (locationFilter) {
                  setLocationFilter(null);
                } else {
                  await handleLocationPress();
                }
              }}
              style={{
                marginLeft: 12,
                borderRadius: 28,
                width: 48,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: locationFilter ? "#DA291C" : "#fff",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
              accessibilityLabel="Location"
            >
              <Feather
                name="map-pin"
                size={28}
                color={locationFilter ? "#fff" : "#DA291C"}
              />
            </TouchableOpacity>
          </View>
        )}
      </>
    ),
    [
      setCautionModalVisible,
      setSearchBarVisible,
      setLocationFilter,
      locationFilter,
      searchBarVisible,
      searchText,
      windowWidth,
      cautionModalVisible,
      restaurants.length,
      buttonFadeStyle,
    ]
  );

  useEffect(() => {
    setDebouncedSearchText(searchText);
  }, [searchText]);

  // Add this function near other handlers
  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    setDeleting(true);
    try {
      await deleteRestaurant(restaurantToDelete.id);
      await fetchRestaurants();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete restaurant.");
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setRestaurantToDelete(null);
      closeAllModals();
    }
  };

  // Standard onScroll handler for FlatList
  const onScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrollY(y < -20 ? -20 : y);
  };

  const handleCardLayout = (e) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  const handleTouchStart = (e) => {
    if (!cardWidth) return setSwipeEnabled(true);
    const x = e.nativeEvent.locationX;
    if (x >= cardWidth - SCREEN_RIGHT_EDGE_IGNORE_PX) {
      setSwipeEnabled(false);
    } else {
      setSwipeEnabled(true);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <RNAnimated.View
        style={[
          styles.container,
          showHomeFadeIn ? { opacity: homeFadeAnim } : {},
        ]}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Fixed EpiEats Title */}
          <RNAnimated.View
            style={[
              {
                position: "absolute",
                top: 85,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 50,
                pointerEvents: "box-none",
              },
              buttonFadeStyle,
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCautionModalVisible(true);
              }}
            >
              <Text style={[styles.title, { fontSize: 28, marginBottom: 0 }]}>
                <Text
                  style={[
                    styles.epi,
                    cautionModalVisible && { color: "#DA291C" },
                  ]}
                >
                  Epi
                </Text>
                <Text
                  style={[
                    styles.eats,
                    cautionModalVisible && { color: "#DA291C" },
                  ]}
                >
                  Eats
                </Text>
              </Text>
            </TouchableOpacity>
          </RNAnimated.View>
          {/* Main content */}
          <FlatList
            pointerEvents="auto"
            data={filteredRestaurants}
            renderItem={({ item }) => {
              let distance: number | null = null;
              const lat = item.location?.coordinates?.[1] ?? 0;
              const lng = item.location?.coordinates?.[0] ?? 0;
              if (locationFilter) {
                distance = getDistance(
                  locationFilter.lat,
                  locationFilter.lng,
                  lat,
                  lng
                );
              }
              const isNew = newlyAddedRestaurantId === item.id;
              return (
                <RestaurantCard
                  key={item.id + "-" + (item.apimatch || "custom")}
                  item={item}
                  isNew={isNew}
                  cardAnim={cardAnim}
                  locationFilter={locationFilter}
                  distance={distance}
                  handlePress={handlePress}
                  handleLongPress={(item, layout) =>
                    handleLongPress(item, layout)
                  }
                  onDelete={async (restaurant) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await deleteRestaurant(restaurant.id);
                    await fetchRestaurants();
                  }}
                  openSwipeId={null}
                  setOpenSwipeId={() => {}}
                  selectedId={restaurantToDelete?.id}
                />
              );
            }}
            keyExtractor={(item) => item.id + "-" + (item.apimatch || "custom")}
            contentContainerStyle={[
              styles.listContainer,
              { paddingHorizontal: 20, paddingTop: 55 },
            ]}
            ListHeaderComponent={listHeader}
            ListFooterComponent={
              loading
                ? () => (
                    <Text style={{ alignSelf: "center", marginTop: 30 }}>
                      Loading...
                    </Text>
                  )
                : restaurants.length === 0
                ? () => (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        Scan your first menu!
                      </Text>
                      <MenuSvg
                        width={72}
                        height={72}
                        style={styles.menuSvg}
                        color="#E0E0E0"
                      />
                      <Svg
                        width={64}
                        height={64}
                        viewBox="0 0 64 64"
                        style={styles.downArrowSvg}
                      >
                        <Path
                          d="M32 8v40M32 48l-16-16M32 48l16-16"
                          stroke="#E0E0E0"
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  )
                : null
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
          />

          <View style={styles.bottomBar}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={styles.iconButton}
                onPress={takePhoto}
                accessibilityLabel="Add menu photo"
              >
                <FontAwesome name="camera" size={36} color="#DA291C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading Overlay - render last so it's above everything */}
          {showLoadingOverlay && !showNoMenuModal && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 9999, elevation: 9999 },
              ]}
              pointerEvents="auto"
            >
              <BlurView
                intensity={80}
                style={StyleSheet.absoluteFill}
                tint="light"
              />
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <AnimatedMagnifierPeanut />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 32,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 22,
                      color: "#DA291C",
                      fontWeight: "bold",
                      letterSpacing: 1,
                    }}
                  >
                    Finding allergens
                  </Text>
                  <AnimatedDots />
                </View>
                {/* X button to cancel loading */}
                <TouchableOpacity
                  style={{
                    marginTop: 66,
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#fff",
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }}
                  onPress={() => setShowLoadingOverlay(false)}
                  accessibilityLabel="Cancel finding allergens"
                >
                  <Feather name="x" size={28} color="#DA291C" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showSuccessOverlay && (
            <RNAnimated.View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 9999, elevation: 9999, opacity: successOverlayAnim },
              ]}
              pointerEvents="auto"
            >
              <BlurView
                intensity={80}
                style={StyleSheet.absoluteFill}
                tint="light"
              />
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <FadeInCheck visible={showSuccessOverlay} />
              </View>
            </RNAnimated.View>
          )}

          {showNoMenuModal && (
            <RNAnimated.View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 9999, elevation: 9999 },
              ]}
              pointerEvents="auto"
            >
              <BlurView
                intensity={80}
                style={StyleSheet.absoluteFill}
                tint="light"
              />
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <RNAnimated.View
                  style={{ position: "absolute", opacity: magnifierFadeAnim }}
                >
                  <AnimatedMagnifierPeanut />
                </RNAnimated.View>
                <RNAnimated.View
                  style={{ position: "absolute", opacity: cautionFadeAnim }}
                >
                  <AnimatedCaution />
                </RNAnimated.View>
              </View>
            </RNAnimated.View>
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
              setRestaurantNameInput("");
              navigation.navigate("Home");
            }}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.3)",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => {
                setRestaurantNameModalVisible(false);
                setPendingImageBase64(null);
                setPendingImageUri(null);
                setPendingLocation(null);
                setRestaurantNameInput("");
                navigation.navigate("Home");
              }}
            >
              <Pressable
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  width: "85%",
                  alignItems: "center",
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    marginBottom: 18,
                    color: "#222",
                  }}
                >
                  Enter Restaurant Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    marginBottom: 18,
                    fontSize: 16,
                    fontFamily: "ReadexPro-Regular",
                  }}
                  placeholder="Restaurant Name"
                  value={restaurantNameInput}
                  onChangeText={setRestaurantNameInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: "#DA291C",
                    paddingVertical: 8,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={handleRestaurantNameSubmit}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}
                  >
                    Submit
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={deleteModalVisible}
            animationType="fade"
            transparent
            onRequestClose={closeAllModals}
          >
            {deleteModalPosition ? (
              <View
                style={{
                  position: "absolute",
                  top:
                    deleteModalPosition.y + deleteModalPosition.height / 2 - 60, // center vertically, modal height ~96
                  left:
                    deleteModalPosition.x + deleteModalPosition.width / 2 - 110, // center horizontally, modal width ~220
                  zIndex: 9999,
                  backgroundColor: "transparent",
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    minWidth: 220,
                    minHeight: 96,
                    justifyContent: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={closeAllModals}
                    style={{ marginHorizontal: 10, padding: 8 }}
                    accessibilityLabel="Cancel"
                  >
                    <Feather name="x" size={32} color="#222" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await handleDeleteRestaurant();
                    }}
                    style={{ marginHorizontal: 10, padding: 8 }}
                    accessibilityLabel="Delete"
                  >
                    <Feather name="trash-2" size={32} color="#DA291C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      closeAllModals();
                      if (restaurantToDelete)
                        handleEditRestaurant(restaurantToDelete);
                    }}
                    style={{ marginHorizontal: 10, padding: 8 }}
                    accessibilityLabel="Edit"
                  >
                    <Feather name="edit-2" size={32} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: "transparent" }} />
            )}
          </Modal>

          {/* Edit Restaurant Name Modal */}
          <Modal
            visible={editModalVisible}
            animationType="slide"
            transparent
            onRequestClose={closeAllModals}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.3)",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={closeAllModals}
            >
              <Pressable
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  width: "85%",
                  alignItems: "center",
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    marginBottom: 18,
                    color: "#222",
                  }}
                >
                  Apply Changes?
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    marginBottom: 18,
                    fontSize: 16,
                    fontFamily: "ReadexPro-Regular",
                  }}
                  placeholder="Restaurant Name"
                  value={editNameInput}
                  onChangeText={setEditNameInput}
                  autoFocus
                  editable={!editSaving}
                />
                <View
                  style={{
                    flexDirection: "row",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#eee",
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 8,
                      marginRight: 8,
                      flex: 1,
                      alignItems: "center",
                    }}
                    onPress={closeAllModals}
                    disabled={editSaving}
                  >
                    <Text
                      style={{
                        color: "#222",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#000",
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 8,
                      flex: 1,
                      alignItems: "center",
                      opacity: editSaving ? 0.6 : 1,
                    }}
                    onPress={handleEditNameSubmit}
                    disabled={editSaving}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      {editSaving ? "Saving..." : "Apply"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Caution Disclaimer Modal */}
          <Modal
            visible={cautionModalVisible}
            animationType="fade"
            transparent
            onRequestClose={() => setCautionModalVisible(false)}
          >
            <BlurView
              intensity={80}
              style={StyleSheet.absoluteFill}
              tint="light"
            />
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 32,
                  width: "85%",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Feather
                  name="alert-triangle"
                  size={48}
                  color="#DA291C"
                  style={{ marginBottom: 18 }}
                />
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "bold",
                    color: "#DA291C",
                    marginBottom: 12,
                  }}
                >
                  Disclaimer
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#222",
                    textAlign: "center",
                    marginBottom: 18,
                  }}
                >
                  This app is for informational purposes only and does not
                  replace professional medical advice. Always confirm allergen
                  information with restaurant staff or your physician. The
                  creators of this app are not liable for any allergic reactions
                  or health issues.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#DA291C",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 32,
                    marginTop: 8,
                  }}
                  onPress={() => setCautionModalVisible(false)}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                  >
                    Understood!
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Floating help button in top left */}
          <RNAnimated.View
            style={[styles.helpButtonLeft, buttonFadeStyle]}
            pointerEvents={undefined}
          >
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("OnboardingCarouselDemo" as any, {
                  fromHelp: true,
                  preloadedVideoUri,
                })
              }
              accessibilityLabel="Help"
            >
              <FontAwesome name="question-circle" size={30} color="#DA291C" />
            </TouchableOpacity>
          </RNAnimated.View>
          {/* Floating profile button in top right */}
          <RNAnimated.View
            style={[styles.profileButtonRight, buttonFadeStyle]}
            pointerEvents={undefined}
          >
            <TouchableOpacity
              onPress={goToProfileSetup}
              accessibilityLabel="Profile"
            >
              <FontAwesome name="user" size={30} color="#DA291C" />
            </TouchableOpacity>
          </RNAnimated.View>
        </GestureHandlerRootView>
      </RNAnimated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "visible",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    flexDirection: "row",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 0,
  },
  epi: {
    fontFamily: "ReadexPro-Regular",
    fontWeight: "400",
    color: "#222",
  },
  eats: {
    fontFamily: "ReadexPro-Bold",
    fontWeight: "bold",
    color: "#DA291C",
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 32,
    zIndex: 10,
    position: "relative",
  },
  searchBar: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    fontSize: 16,
    borderLeftWidth: 0,
    height: 44,
    fontFamily: "ReadexPro-Regular",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  card: {
    width: "100%",
    marginBottom: 28,
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    flexDirection: "row",
  },
  name: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 0,
    fontFamily: "ReadexPro-Bold",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 90,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 0.2,
    borderTopColor: "#ccc",
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  iconButton: {
    backgroundColor: "transparent",
    borderRadius: 0,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
    borderColor: "transparent",
    marginHorizontal: 12,
    alignSelf: "center",
    marginBottom: 20,
  },
  locationButton: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
    borderRightWidth: 0,
  },
  locationButtonActive: {
    backgroundColor: "#DA291C",
    borderColor: "#DA291C",
  },
  profileButtonLeft: {
    position: "absolute",
    top: 80,
    left: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  userNameContainer: {
    position: "absolute",
    top: 80,
    left: 24,
    zIndex: 11,
    backgroundColor: "transparent",
  },
  userNameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#DA291C",
    fontFamily: "ReadexPro-Bold",
  },
  distanceText: {
    marginTop: 8,
    fontSize: 15,
    fontStyle: "italic",
    color: "#555",
    textAlign: "center",
  },
  helpButtonRight: {
    position: "absolute",
    top: 80,
    right: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  helpButtonLeft: {
    position: "absolute",
    top: 80,
    left: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  profileButtonRight: {
    position: "absolute",
    top: 80,
    right: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 320,
    marginBottom: 120,
  },
  emptyText: {
    color: "#E0E0E0",
    fontWeight: "bold",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "ReadexPro-Bold",
  },
  downArrowSvg: {
    marginTop: -10,
    alignSelf: "center",
  },
  menuSvg: {
    marginBottom: 32,
    alignSelf: "center",
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
    return () => {
      running = false;
    };
  }, []);

  // The icon will be centered in a flex container, and the circle will be relative to that center
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return (
    <View
      style={{
        width: iconSize * 2,
        height: iconSize * 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -iconSize / 2 + x,
          marginTop: -iconSize / 2 + y,
        }}
      >
        <FontAwesome5
          name="search"
          size={iconSize}
          color="#DA291C"
          solid
          style={{ fontWeight: "bold" }}
        />
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
  return (
    <Text style={{ color: "#DA291C", fontSize: 22, fontWeight: "bold" }}>
      {".".repeat(dotCount)}
    </Text>
  );
};

// Restore FadeInCheck with internal animation and visible prop
const FadeInCheck = ({ visible }: { visible: boolean }) => {
  const fadeAnim = React.useRef(new RNAnimated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);
  return (
    <RNAnimated.View
      style={{
        opacity: fadeAnim,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather
        name="check"
        size={120}
        color="#22c55e"
        style={{ fontWeight: "bold" }}
      />
      <Text
        style={{
          marginTop: 32,
          fontSize: 36,
          color: "#22c55e",
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        Success!
      </Text>
    </RNAnimated.View>
  );
};

// AnimatedCaution: yellow caution symbol with text, for no menu detected
const AnimatedCaution = () => {
  const fadeAnim = React.useRef(new RNAnimated.Value(0)).current;
  React.useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <RNAnimated.View
      style={{
        opacity: fadeAnim,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather
        name="alert-triangle"
        size={120}
        color="#FFD600"
        style={{ fontWeight: "bold" }}
      />
      <Text
        style={{
          marginTop: 32,
          fontSize: 36,
          color: "#FFD600",
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        No Menu Detected
      </Text>
    </RNAnimated.View>
  );
};

export default HomeScreen;
