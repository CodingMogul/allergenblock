import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';

export default function WelcomeScreen() {
  const [firstName, setFirstName] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadProfileAndAnimate = async () => {
      try {
        const profileData = await AsyncStorage.getItem('userProfile');
        if (profileData) {
          const { firstName } = JSON.parse(profileData);
          setFirstName(firstName);
          
          // Start fade in animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();

          // Navigate to Home screen after 2.5 seconds
          setTimeout(() => {
            navigation.replace('Home');
          }, 2500);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfileAndAnimate();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
        Let's eat, <Text style={styles.nameText}>{firstName}</Text>!
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
  },
  nameText: {
    color: '#DA291C',
  },
}); 