import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';

export default function TitleScreen() {
  const logoTitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Fade in logo and title together
    Animated.timing(logoTitleOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // Fade in subtitle after 2.5 seconds
    const subtitleTimeout = setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }, 2500);

    // Fade in continue button after 5 seconds
    const buttonTimeout = setTimeout(() => {
      Animated.timing(continueButtonOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }, 5000);

    return () => {
      clearTimeout(subtitleTimeout);
      clearTimeout(buttonTimeout);
    };
  }, []);

  const handleContinue = () => {
    navigation.navigate('InstructionPage');
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { opacity: logoTitleOpacity }]}>🥜</Animated.Text>
      <Animated.Text style={[styles.title, { opacity: logoTitleOpacity }]}>
        <Text style={styles.epi}>Epi</Text>
        <Text style={styles.eats}>Eats</Text>
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Having allergies should not be a burden.
      </Animated.Text>
      <Animated.View style={[styles.bottomButtonContainer, { opacity: continueButtonOpacity }]}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 250,
  },
  logo: {
    fontSize: 64,
    marginBottom: 40,
    textAlign: 'center',
  },
  title: {
    flexDirection: 'row',
    fontSize: 54,
    textAlign: 'center',
    marginBottom: 16,
  },
  epi: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400',
    color: '#222',
  },
  eats: {
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    color: '#DA291C',
  },
  subtitle: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 350,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
});