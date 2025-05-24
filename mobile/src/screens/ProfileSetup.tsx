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
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';
import { useUserProfile } from '../context/UserProfileContext';
import { Feather } from '@expo/vector-icons';
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

  useFocusEffect(
    useCallback(() => {
      setSelectedAllergens(profile.allergens || []);
    }, [profile])
  );

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      const userProfile = {
        ...profile,
        allergens: selectedAllergens
      };
      await updateProfile(userProfile);
      if (canGoBack) {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
      } else {
        navigation.navigate('Welcome');
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
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' }}>
      {canGoBack && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.replace('Home')}
          accessibilityLabel="Go to Home"
        >
          <Feather name="home" size={28} color={isDarkMode ? '#eee' : '#222'} />
        </TouchableOpacity>
      )}
      <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}
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
          onPress={handleSaveProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={isDarkMode ? '#eee' : '#000'} />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
        {showSaved && (
          <Text style={{ color: 'green', textAlign: 'center', marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
            Saved!
          </Text>
        )}
      </ScrollView>
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
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'ReadexPro-Bold',
    marginBottom: 25,
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
    color: '#000',
    fontSize: 20,
    fontFamily: 'ReadexPro-Bold',
  },
  homeButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
}); 