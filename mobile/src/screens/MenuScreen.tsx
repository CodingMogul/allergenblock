import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import {
  TapGestureHandler,
  GestureHandlerRootView,
  TapGestureHandlerEventPayload,
  GestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  interpolate,
  useAnimatedGestureHandler,
  runOnJS,
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

function normalizeMenuItems(rawMenuItems: any[]): MenuItem[] {
  return rawMenuItems.map((item, idx) => ({
    id: item.id || idx.toString(),
    name: item.name,
    allergens: item.allergens || [],
    certainty: item.certainty,
  }));
}

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
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = React.useRef<RNTextInput>(null);

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
          const menuItems = found && found.menuItems ? normalizeMenuItems(found.menuItems) : [];
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

  const openAllergenModal = () => {
    setSelectedAllergens(profile.allergens || []);
    setModalVisible(true);
  };

  const saveAllergens = async () => {
    await updateProfile({ allergens: selectedAllergens });
    setModalVisible(false);
  };

  // Use profile.allergens for allergen matching
  const userAllergies = profile.allergens.length > 0 ? profile.allergens : ['peanuts', 'gluten', 'dairy'];

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

  // Filter and sort menu items by similarity if searchText is present
  const filteredMenu = React.useMemo(() => {
    if (!searchText.trim()) return menu;
    const search = searchText.trim().toLowerCase();
    return [...menu]
      .map(item => ({ ...item, similarity: getSimilarity(item.name, searchText) }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }, [menu, searchText]);

const Card = ({ item, index }: { item: MenuItem; index: number }) => {
  const normalizedUserAllergies = userAllergies.map(u => u.toLowerCase().trim());
  const matchCount = item.allergens.filter(a => normalizedUserAllergies.includes(a.toLowerCase().trim())).length;
  const isExpanded = expandedIndex === index && matchCount > 0;
  const canExpand = matchCount > 0;
  const [pressed, setPressed] = useState(false);

  const baseCardStyle = [
    styles.menuCard,
    pressed && {
      transform: [{ scale: 1.02 }],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      elevation: 16,
    },
    {
      minHeight: isExpanded ? 160 : 100,
    },
  ];

  const CardContainer = ({ children }: { children: React.ReactNode }) => (
    <View style={baseCardStyle}>{children}</View>
    // Use BlurView on iOS if you want: 
    // <BlurView intensity={40} tint="light" style={baseCardStyle}>{children}</BlurView>
  );

  if (!canExpand) {
    return (
      <Pressable>
        <CardContainer>
          <View style={styles.menuCardContent}>
            <View style={styles.menuTextCenterer}>
              <Text style={styles.menuItemName}>{item.name}</Text>
            </View>
            <Text style={[styles.menuItemAllergensCount, { color: '#4CAF50' }]}>No allergen matches</Text>
          </View>
        </CardContainer>
      </Pressable>
    );
  }

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
        <View style={styles.menuCardContent}>
          <View style={styles.menuTextCenterer}>
            <Text style={styles.menuItemName}>{item.name}</Text>
          </View>
          <Text style={[
            styles.menuItemAllergensCount,
            matchCount === 0 ? { color: '#4CAF50' } : {}
          ]}>
            {matchCount === 0
              ? 'No allergen matches'
              : `${matchCount} allergen(s) match your profile`}
          </Text>
          {isExpanded && (
            <View style={styles.allergenListContainer}>
              <View style={styles.allergenRow}>
                <Text style={styles.menuItemAllergensExpanded}>Contains:</Text>
                <Text style={[styles.allergenText, { marginLeft: 4 }]}>
                  {item.allergens.map((allergen, i) => (
                    <Text key={i}>
                      {i > 0 ? ', ' : ''}
                      <Text style={userAllergies.includes(allergen) ? { fontWeight: 'bold', color: '#ff4d4d' } : {}}>
                        {allergen}
                      </Text>
                    </Text>
                  ))}
                </Text>
              </View>
            </View>
          )}
        </View>
      </CardContainer>
    </Pressable>
  );
};

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (searchBarVisible) {
          setSearchBarVisible(false);
          Keyboard.dismiss();
        }
      }}
      accessible={false}
    >
      <GestureHandlerRootView style={styles.container}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.replace('Home')}
          accessibilityLabel="Go to Home"
        >
          <Feather name="home" size={28} color="#222" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={openAllergenModal}
          accessibilityLabel="Profile"
        >
          <Feather name="user" size={30} color="#222" />
        </TouchableOpacity>

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
                {ALLERGENS.map((allergen) => (
                  <TouchableOpacity
                    key={allergen.id}
                    style={[
                      styles.modalAllergenButton,
                      selectedAllergens.includes(allergen.id) && styles.modalAllergenButtonSelected
                    ]}
                    onPress={() => {
                      setSelectedAllergens((current) =>
                        (current as string[]).includes(allergen.id)
                          ? (current as string[]).filter(id => id !== allergen.id)
                          : [...(current as string[]), allergen.id]
                      );
                    }}
                  >
                    <Text style={styles.modalAllergenEmoji}>{allergen.emoji}</Text>
                    <Text style={styles.modalAllergenText}>{allergen.name}</Text>
                  </TouchableOpacity>
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

        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          {latestRestaurant.brandLogo && (
            <Image source={{ uri: latestRestaurant.brandLogo }} style={{ width: 64, height: 64, marginBottom: 12 }} resizeMode="contain" />
          )}
          <Pressable
            onLongPress={handleEditRestaurantName}
            delayLongPress={500}
            style={{ width: '100%' }}
          >
            <Text style={styles.header}>
              {`${getDisplayName(latestRestaurant)} Menu`}
            </Text>
          </Pressable>
        </View>
        <LinearGradient
          colors={['#fff', 'rgba(255,255,255,0)']}
          style={{
            width: '100%',
            height: 32,
            marginTop: -12,
            marginBottom: 8,
            zIndex: 2,
          }}
          pointerEvents="none"
        />
        {/* Magnifying glass icon or search bar */}
        {!searchBarVisible ? (
          <TouchableOpacity onPress={() => {
            setSearchBarVisible(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }} style={{ marginTop: 0, marginBottom: 2 }}>
            <Feather name="search" size={28} color="#222" />
          </TouchableOpacity>
        ) : (
          <RNTextInput
            ref={searchInputRef}
            style={{
              width: '90%',
              backgroundColor: '#fff',
              borderRadius: 25,
              borderWidth: 1,
              borderColor: '#000',
              paddingVertical: 7,
              paddingHorizontal: 16,
              fontSize: 16,
              fontFamily: 'Inter-Regular',
              marginBottom: 8,
              alignSelf: 'center',
            }}
            placeholder="Search menu items"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onBlur={() => setSearchBarVisible(false)}
            autoFocus
          />
        )}

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
                style={{ backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', opacity: editSaving ? 0.6 : 1 }}
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
          <FlatList
            data={filteredMenu}
            renderItem={({ item, index }) => <Card item={item} index={index} />}
            keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
            contentContainerStyle={styles.scrollView}
          />
        )}
      </GestureHandlerRootView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 150,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'center',
    fontFamily: 'Inter-Bold',
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
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
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 0,
    fontFamily: 'Inter-Regular',
  },
  menuItemAllergensCount: {
    fontSize: 12,
    color: '#ff4d4d', // defined red
    marginTop: -20,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  homeButton: {
    position: 'absolute',
    top: 80,
    left: 24,
    zIndex: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    fontFamily: 'Inter-Bold',
  },
  modalAllergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
    width: '100%',
  },
  modalAllergenButton: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modalAllergenButtonSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#F0F8FF',
  },
  modalAllergenEmoji: {
    fontSize: 22,
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  modalAllergenText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  modalSaveButton: {
    backgroundColor: '#2563eb',
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
    fontFamily: 'Inter-Bold',
  },
});