import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';
import { useUserProfile } from '../context/UserProfileContext';
import { Feather } from '@expo/vector-icons';

const ALLERGENS = [
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

export default function ProfileSetup() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProfileSetup'>>();
  const canGoBack = route.params?.canGoBack;
  const { profile, updateProfile } = useUserProfile();
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(profile.allergens || []);
  const [isLoading, setIsLoading] = useState(false);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setSelectedAllergens(profile.allergens || []);
    }, [profile])
  );

  const toggleAllergen = (allergenId: string) => {
    setSelectedAllergens(current => 
      current.includes(allergenId)
        ? current.filter(id => id !== allergenId)
        : [...current, allergenId]
    );
  };

  const validateInputs = () => {
    let isValid = true;
    
    if (!firstName.trim()) {
      setFirstNameError('First name is required');
      isValid = false;
    } else {
      setFirstNameError('');
    }

    if (!lastName.trim()) {
      setLastNameError('Last name is required');
      isValid = false;
    } else {
      setLastNameError('');
    }

    if (selectedAllergens.length === 0) {
      Alert.alert(
        'No Allergens Selected',
        'Are you sure you want to continue without selecting any allergens?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => isValid = false
          },
          {
            text: 'Continue',
            onPress: () => handleSaveProfile()
          }
        ]
      );
      return false;
    }

    return isValid;
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      const userProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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

  const handleSave = () => {
    if (validateInputs()) {
      handleSaveProfile();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {canGoBack && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.replace('Home')}
          accessibilityLabel="Go to Home"
        >
          <Feather name="home" size={28} color="#222" />
        </TouchableOpacity>
      )}
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Profile Setup</Text>
        <Text style={styles.subtitle}>Let's set up your allergy profile!</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, firstNameError ? styles.inputError : null]}
            placeholder="First Name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFirstNameError('');
            }}
            placeholderTextColor="#aaa"
          />
          {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
          
          <TextInput
            style={[styles.input, lastNameError ? styles.inputError : null]}
            placeholder="Last Name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setLastNameError('');
            }}
            placeholderTextColor="#aaa"
          />
          {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Select Your Allergens</Text>
        <View style={styles.allergenGrid}>
          {ALLERGENS.map((allergen) => (
            <TouchableOpacity
              key={allergen.id}
              style={[
                styles.allergenButton,
                selectedAllergens.includes(allergen.id) && styles.allergenButtonSelected
              ]}
              onPress={() => toggleAllergen(allergen.id)}
            >
              <Text style={styles.allergenEmoji}>{allergen.emoji}</Text>
              <Text style={styles.allergenText}>{allergen.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
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
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 100,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#DA291C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    height: 50,
    borderWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 22,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    fontFamily: 'Inter',
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#222',
    marginBottom: 16,
  },
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  allergenButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  allergenButtonSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#F0F8FF',
  },
  allergenEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allergenText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#222',
    textAlign: 'center',
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
    fontFamily: 'Inter-Bold',
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