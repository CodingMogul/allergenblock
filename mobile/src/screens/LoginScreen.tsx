import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TitleScreen() {
  const logoTitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Fade in logo and title together
    Animated.timing(logoTitleOpacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();

    // Fade in subtitle after 2.5 seconds
    const subtitleTimeout = setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Fade in continue button after 5 seconds
    const buttonTimeout = setTimeout(() => {
      Animated.timing(continueButtonOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, 2000);

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
      <Animated.View style={{ opacity: logoTitleOpacity }}>
        <MaterialCommunityIcons
          name="peanut"
          size={96}
          color="#DA291C"
          style={{
            marginBottom: 15,
            textAlign: 'center',
            transform: [{ rotate: '-30deg' }],
          }}
        />
      </Animated.View>
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
  title: {
    flexDirection: 'row',
    fontSize: 54,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'ReadexPro-Bold',
  },
  epi: {
    fontFamily: 'ReadexPro-Regular',
    fontWeight: '400',
    color: '#222',
  },
  eats: {
    fontFamily: 'ReadexPro-Bold',
    fontWeight: 'bold',
    color: '#DA291C',
  },
  subtitle: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
    fontFamily: 'ReadexPro-Regular',
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
    fontFamily: 'ReadexPro-Regular',
  },
});