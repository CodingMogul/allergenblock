import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';
import { useUserProfile } from '../context/UserProfileContext';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useUserProfile();

  const handleEditProfile = () => {
    navigation.navigate('ProfileSetup');
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileInfo}>
        <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.sectionTitle}>Your Allergens:</Text>
        <View style={styles.allergenList}>
          {profile.allergens.map((allergen) => (
            <Text key={allergen} style={styles.allergenItem}>• {allergen}</Text>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.editButton}
        onPress={handleEditProfile}
      >
        <Text style={styles.editButtonText}>Edit Profile →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  profileInfo: {
    marginBottom: 32,
  },
  name: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#222',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#666',
    marginBottom: 16,
  },
  allergenList: {
    paddingLeft: 8,
  },
  allergenItem: {
    fontSize: 18,
    fontFamily: 'Inter',
    color: '#222',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#000',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
});