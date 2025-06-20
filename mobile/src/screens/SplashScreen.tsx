import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RED = '#DA291C';
const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const peanutAnim = useRef(new Animated.Value(40)).current; // path length
  const overlayFade = useRef(new Animated.Value(0)).current;
  const [showOverlay, setShowOverlay] = React.useState(false);

  useEffect(() => {
    // Animate fade in and peanut draw
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      Animated.timing(peanutAnim, {
        toValue: 0,
        duration: 1200,
        delay: 200,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ]).start();
    // After 1.2s, fade in white overlay, then navigate to Home
    const timeout = setTimeout(() => {
      setShowOverlay(true);
      Animated.timing(overlayFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        (navigation as any).reset({ index: 0, routes: [{ name: 'Home' }] });
      });
    }, 1200);
    return () => clearTimeout(timeout);
  }, [fadeAnim, peanutAnim, navigation]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <Animated.View style={[styles.centered, { opacity: fadeAnim, marginTop: -90 }]}> 
        <MaterialCommunityIcons
          name="peanut"
          size={150}
          color="#DA291C"
          style={{
            marginBottom: 18,
            textAlign: 'center',
            alignSelf: 'center',
            transform: [{ rotate: '-30deg' }],
          }}
        />
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.epiEatsText}>
            <Text style={styles.epi}>Epi</Text>
            <Text style={styles.eatsRed}>Eats</Text>
          </Text>
        </View>
      </Animated.View>
      {showOverlay && (
        <Animated.View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#fff',
          opacity: overlayFade,
          zIndex: 999,
        }} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  epiEatsText: {
    fontSize: 72,
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  epi: {
    color: '#111',
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Regular',
    textAlign: 'center',
  },
  eatsRed: {
    color: '#DA291C',
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
  },
});

export default SplashScreen; 