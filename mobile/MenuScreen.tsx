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
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from './config'; // Ensure this file holds your machine's IP
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from './types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  name: string;
  allergens: string[];
}

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

export default function MenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { restaurant } = route.params as {
    restaurant: { id: string; name: string };
  };

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileAllergens, setProfileAllergens] = useState<AllergenId[]>([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/menuDetails/${restaurant.id}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const mapped = data.menuItems.map((item: any, index: number) => ({
            id: index.toString(),
            name: item.name,
            allergens: item.allergens || [],
          }));
          setMenu(mapped);
        } catch (parseError) {
          console.error("JSON Parse error:", text.substring(0, 100));
          throw parseError;
        }
      } catch (error) {
        console.error("Failed to fetch menu:", error);
        setMenu([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Load profile allergens from AsyncStorage on mount
  useEffect(() => {
    const loadProfileAllergens = async () => {
      try {
        const profile = await AsyncStorage.getItem('userProfile');
        if (profile) {
          const { allergens } = JSON.parse(profile);
          setProfileAllergens(allergens || []);
        } else {
          setProfileAllergens([]);
        }
      } catch {
        setProfileAllergens([]);
      }
    };
    loadProfileAllergens();
  }, []);

  // Load allergens from AsyncStorage when modal opens
  const openAllergenModal = async () => {
    try {
      const profile = await AsyncStorage.getItem('userProfile');
      if (profile) {
        const { allergens } = JSON.parse(profile);
        setSelectedAllergens(allergens || []);
      } else {
        setSelectedAllergens([]);
      }
    } catch {
      setSelectedAllergens([]);
    }
    setModalVisible(true);
  };

  const saveAllergens = async () => {
    setSaving(true);
    try {
      const profile = await AsyncStorage.getItem('userProfile');
      let userProfile: { firstName: string; lastName: string; allergens: string[] } = { firstName: '', lastName: '', allergens: [] };
      if (profile) {
        userProfile = JSON.parse(profile);
      }
      userProfile.allergens = selectedAllergens;
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      setProfileAllergens(selectedAllergens); // update profileAllergens state
      setModalVisible(false);
    } catch (e) {
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  // Use profileAllergens for allergen matching
  const userAllergies = profileAllergens.length > 0 ? profileAllergens : ['peanuts', 'gluten', 'dairy'];

  const Card = ({ item, index }: { item: MenuItem; index: number }) => {
    // Calculate actual allergen matches from the item's allergens
    const normalizedUserAllergies = userAllergies.map(u => u.toLowerCase().trim());
    const matchCount = item.allergens.filter(a => normalizedUserAllergies.includes(a.toLowerCase().trim())).length;
    const isExpanded = expandedIndex === index && matchCount > 0;
    const canExpand = matchCount > 0;
    const [pressed, setPressed] = useState(false);

    return (
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          if (canExpand) {
            setExpandedIndex(isExpanded ? null : index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={[styles.menuCard, { backgroundColor: pressed ? '#e0e0e6' : '#f2f2f7', minHeight: isExpanded ? 160 : 100 }]}
        disabled={!canExpand}
      >
        <View style={styles.menuCardContent}>
          <View style={styles.menuTextCenterer}>
            <Text style={styles.menuItemName}>{item.name}</Text>
          </View>
          <Text style={[
            styles.menuItemAllergensCount,
            matchCount === 0 ? { color: '#4CAF50' } : {}
          ]}>
            {matchCount === 0 ? 'No allergen matches' : `${matchCount} allergen(s) match your profile`}
          </Text>
          {isExpanded && (
            <View style={styles.allergenListContainer}>
              <View style={styles.allergenRow}>
                <Text style={styles.menuItemAllergensExpanded}>Contains:</Text>
                <Text style={[styles.allergenText, { marginLeft: 4 }]}>
                  {item.allergens.map((allergen, index) => (
                    <Text key={index}>
                      {index > 0 ? ', ' : ''}
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
      </Pressable>
    );
  };

  return (
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
                      (current as AllergenId[]).includes(allergen.id)
                        ? (current as AllergenId[]).filter(id => id !== allergen.id)
                        : [...(current as AllergenId[]), allergen.id]
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

      <Text style={styles.header}>{restaurant.name} Menu</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={menu}
          renderItem={({ item, index }) => <Card item={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollView}
        />
      )}
    </GestureHandlerRootView>
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
    marginBottom: 40,
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
    backgroundColor: '#f2f2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  },
  menuItemAllergensCount: {
    fontSize: 12,
    color: '#ff4d4d', // defined red
    marginTop: -20,
    marginBottom: 20,
    textAlign: 'center',
  },
  allergenListContainer: {
    width: '100%',
    marginTop: 0,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuItemAllergensExpanded: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenText: {
    color: '#000',
    fontSize: 14,
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
  },
  modalAllergenText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
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
  },
});
