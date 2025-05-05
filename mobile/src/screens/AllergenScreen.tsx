import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation'; // Make sure you import this!

const ALLERGENS = [
  'Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Gluten', 'Dairy'
];

export default function AllergensScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleAllergen = (allergen: string) => {
    setSelected(selected =>
      selected.includes(allergen)
        ? selected.filter(a => a !== allergen)
        : [...selected, allergen]
    );
  };

  const handleContinue = () => {
    // TODO: Save selected allergens somewhere (Context, Backend, etc.)
    navigation.replace('Home');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select your allergies:</Text>
      <View style={styles.allergenGrid}>
        {ALLERGENS.map((allergen) => (
          <TouchableOpacity
            key={allergen}
            style={[
              styles.allergenButton,
              selected.includes(allergen) && styles.selectedButton
            ]}
            onPress={() => toggleAllergen(allergen)}
          >
            <Text
              style={[
                styles.allergenText,
                selected.includes(allergen) && styles.selectedText
              ]}
            >
              {allergen}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, { opacity: selected.length ? 1 : 0.5 }]}
        onPress={handleContinue}
        disabled={!selected.length}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
    alignSelf: 'flex-start',
  },
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 32,
  },
  allergenButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    margin: 6,
    borderWidth: 1.5,
    borderColor: '#bbb',
  },
  selectedButton: {
    backgroundColor: 'lightgreen',
    borderColor: 'lightgreen',
  },
  allergenText: {
    color: '#222',
    fontSize: 15,
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'lightgreen',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
