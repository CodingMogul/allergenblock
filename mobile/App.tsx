import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Define types
interface MenuItem {
  id: number;
  name: string;
  ingredients: string[];
  allergens: string[];
}

// Sample data
const menuItems: MenuItem[] = [
  { id: 1, name: 'Peanut Butter Toast', ingredients: ['bread', 'peanut butter'], allergens: ['peanuts'] },
  { id: 2, name: 'Cheeseburger', ingredients: ['beef', 'cheese', 'bun'], allergens: ['dairy', 'gluten'] },
  { id: 3, name: 'Salad', ingredients: ['lettuce', 'tomato'], allergens: [] },
  { id: 4, name: 'Shrimp Alfredo', ingredients: ['shrimp', 'cream', 'pasta'], allergens: ['shellfish', 'dairy', 'gluten'] },
  { id: 5, name: 'Tofu Stir Fry', ingredients: ['tofu', 'soy sauce', 'vegetables'], allergens: ['soy'] },
];

export default function App() {
  const [items, setItems] = useState<MenuItem[]>(menuItems);
  const userAllergies = ['peanuts', 'dairy']; // define sample allergies

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.header}>AllergenBlock Menu</Text>
      <Text style={styles.subheader}>Tap an item to remove it</Text>
      
      <ScrollView style={styles.scrollView}>
        {items.length > 0 ? (
          items.map((item) => {
            const hasAllergens = item.allergens.some((a) => userAllergies.includes(a));
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.card, 
                  hasAllergens ? styles.cardWithAllergens : null
                ]}
                onPress={() => removeItem(item.id)}
              >
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.ingredients}>Ingredients: {item.ingredients.join(', ')}</Text>
                <Text style={styles.allergens}>
                  Allergens: {item.allergens.length > 0 ? item.allergens.join(', ') : 'None'}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No more menu items!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingTop: 50,
  },
  scrollView: {
    width: '100%',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardWithAllergens: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ingredients: {
    fontSize: 16,
    marginBottom: 10,
  },
  allergens: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  }
});
