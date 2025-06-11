import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Appearance,
  FlatList,
  Dimensions,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';
import { useUserProfile } from '../context/UserProfileContext';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PeanutOutline from '../../assets/icons/PeanutOutline.svg';
import Milk from '../../assets/icons/Milk.svg';
import Eggs from '../../assets/icons/Eggs.svg';
import FishOutline from '../../assets/icons/FishOutline.svg';
import Shrimp from '../../assets/icons/Shrimp.svg';
import TreePine from '../../assets/icons/TreePine.svg';
import Bread from '../../assets/icons/Bread.svg';
import Beans from '../../assets/icons/Beans.svg';
import Sesame from '../../assets/icons/Sesame.svg';
import * as Animatable from 'react-native-animatable';
import Carousel from 'react-native-reanimated-carousel';

const ALLERGENS = [
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'eggs', name: 'Eggs', emoji: '🥚' },
  { id: 'peanuts', name: 'Peanuts', emoji: '🥜' },
  { id: 'treenuts', name: 'Tree Nuts', emoji: '🥜' },
  { id: 'shellfish', name: 'Shellfish', emoji: '🦐' },
  { id: 'fish', name: 'Fish', emoji: '🐟' },
  { id: 'gluten', name: 'Gluten', emoji: '🍞' },
  { id: 'soy', name: 'Soy', emoji: '🫘' },
  { id: 'sesame', name: 'Sesame', emoji: '✨' },
];

const allergenIcons: Record<string, React.FC<any>> = {
  peanut: PeanutOutline,
  milk: Milk,
  egg: Eggs,
  eggs: Eggs,
  fish: FishOutline,
  shellfish: Shrimp,
  'tree nut': TreePine,
  'tree nuts': TreePine,
  gluten: Bread,
  wheat: Bread,
  soy: Beans,
  sesame: Sesame,
  dairy: Milk,
  treenuts: TreePine,
  peanuts: PeanutOutline,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

export default function ProfileSetup() {
  const isDarkMode = Appearance.getColorScheme() === 'dark';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProfileSetup'>>();
  const canGoBack = route.params?.canGoBack;
  const { profile, updateProfile } = useUserProfile();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(profile.allergens || []);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<any>(null);
  const [showNoAllergyModal, setShowNoAllergyModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setSelectedAllergens(profile.allergens || []);
    }, [profile])
  );

  const handleSaveProfile = async (force = false) => {
    if (selectedAllergens.length === 0 && !force) {
      setShowNoAllergyModal(true);
      return;
    }
    try {
      setIsLoading(true);
      const userProfile = {
        ...profile,
        allergens: selectedAllergens
      };
      if (selectedAllergens.length === 0 && force) {
        await updateProfile({ ...profile, allergens: [] });
      } else {
        await updateProfile(userProfile);
      }
      if (route.params?.fromOnboarding) {
        navigation.navigate('Welcome');
      } else if (canGoBack) {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
      } else {
        navigation.navigate('Menu' as any);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save your profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {canGoBack && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            setShowOverlay(true);
            Animated.timing(overlayFade, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }).start();
            console.log('---NAVIGATION LOG--- Navigating from ProfileSetup to HomeScreen');
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          }}
          accessibilityLabel="Go to Home"
        >
          <FontAwesome name="home" size={32} color="#DA291C" />
        </TouchableOpacity>
      )}
      <ScrollView style={[styles.container, { backgroundColor: '#fff', padding: 20 }]}
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
        <Text style={[styles.title, { color: isDarkMode ? '#eee' : '#DA291C', textAlign: 'center' }]}>Allergy Profile</Text>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#eee' : '#222', textAlign: 'center', marginTop: 12 }]}>Select Your Allergens</Text>
        <Animatable.View animation="fadeInUp" duration={600} delay={100} style={{ width: '100%', alignItems: 'center' }}>
          <Carousel
            ref={carouselRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            data={ALLERGENS}
            style={{ marginTop: 20 }}
            loop={false}
            autoPlay={false}
            mode="parallax"
            modeConfig={{ parallaxScrollingScale: 0.85, parallaxScrollingOffset: 60 }}
            snapEnabled={true}
            onSnapToItem={setCurrentIndex}
            renderItem={({ item, index }: { item: typeof ALLERGENS[number]; index: number }) => {
              let iconKey = item.id.toLowerCase();
              if (iconKey === 'peanuts') iconKey = 'peanut';
              if (iconKey === 'treenuts') iconKey = 'tree nuts';
              if (iconKey === 'eggs' || iconKey === 'egg') iconKey = 'eggs';
              if (iconKey === 'shellfish') iconKey = 'shellfish';
              if (iconKey === 'dairy' || iconKey === 'milk') iconKey = 'milk';
              if (iconKey === 'gluten' || iconKey === 'wheat') iconKey = 'gluten';
              if (iconKey === 'soy') iconKey = 'soy';
              if (iconKey === 'sesame') iconKey = 'sesame';
              const Icon = allergenIcons[iconKey];
              const selected = selectedAllergens.includes(item.id);
              const isCentered = index === currentIndex;
              return (
                <TouchableOpacity
                  style={[
                    styles.carouselCard,
                    selected && styles.carouselCardSelected,
                    { backgroundColor: selected ? '#ffeaea' : (isDarkMode ? '#181818' : '#fff') }
                  ]}
                  onPress={() => {
                    if (isCentered) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedAllergens(current =>
                        current.includes(item.id)
                          ? current.filter(id => id !== item.id)
                          : [...current, item.id]
                      );
                    }
                  }}
                  activeOpacity={isCentered ? 0.8 : 1}
                >
                  {selected && (
                    <Feather
                      name="check-circle"
                      size={20}
                      color="#DA291C"
                      style={{ position: 'absolute', top: 10, right: 10 }}
                    />
                  )}
                  {Icon && <Icon width="80%" height="80%" />}
                  <Text style={styles.cardText}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </Animatable.View>
        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled, { alignSelf: 'center' }]}
          onPress={() => handleSaveProfile()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={isDarkMode ? '#eee' : '#000'} />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
        {showSaved && (
          <Text style={{ color: '#000', textAlign: 'center', marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
            Saved!
          </Text>
        )}
      </ScrollView>
      {showNoAllergyModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: 320, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#DA291C', marginBottom: 16, fontFamily: 'ReadexPro-Bold', textAlign: 'center' }}>No allergy selected</Text>
            <Text style={{ fontSize: 16, color: '#222', marginBottom: 24, textAlign: 'center' }}>You have not selected any allergens. Are you sure you want to continue?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#DA291C', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginRight: 12 }}
                onPress={() => { setShowNoAllergyModal(false); handleSaveProfile(true); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#eee', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }}
                onPress={() => { setShowNoAllergyModal(false); }}
              >
                <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* White fade overlay for transition */}
      {showOverlay && (
        <Animated.View
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
  },
  title: {
    fontSize: 32,
    fontFamily: 'ReadexPro-Bold',
    marginBottom: 35,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'ReadexPro-Bold',
    marginBottom: 15,
  },
  carouselCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 10,
  },
  carouselCardSelected: {
    backgroundColor: '#ffeaea',
  },
  cardText: {
    fontSize: 16,
    fontFamily: 'ReadexPro-Bold',
    marginTop: 12,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#DA291C',
    fontSize: 20,
    fontFamily: 'ReadexPro-Bold',
  },
  homeButton: {
    position: 'absolute',
    top: 80,
    left: 25,
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
}); 