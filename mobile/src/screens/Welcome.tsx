import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const DIAGONAL = Math.sqrt(width * width + height * height);
const RED = '#DA291C';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Welcome = () => {
  const navigation = useNavigation();
  const peanutAnim = useRef(new Animated.Value(56)).current; // peanut path length
  const lineAnim = useRef(new Animated.Value(28)).current;   // line path length
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    // Dissolve in the screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Delay before peanut drawing
    setTimeout(() => {
      Animated.timing(peanutAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        // Animate the line after the peanut
        Animated.timing(lineAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(() => {
          setTimeout(() => {
            (navigation as any).navigate('Home');
          }, 1500);
        });
      });
    }, 600 + 600); // 600ms delay after fade

    return () => {};
  }, [peanutAnim, lineAnim, navigation]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: RED, opacity: fadeAnim }]}>
      {/* Animated peanut and line above the text */}
      <Svg width={160} height={160} viewBox="0 0 24 24" style={{ marginBottom: 16, zIndex: 2 }}>
        <AnimatedPath
          d="M12 2c2.5 0 5 2 5 5c0 1.13 -0.37 2.16 -1 3c-0.28 0.38 -0.5 1 -0.5 1.5c0 0.5 0.2 0.91 0.5 1.23c0.93 0.98 1.5 2.31 1.5 3.77c0 3.04 -2.46 5.5 -5.5 5.5c-3.04 0 -5.5 -2.46 -5.5 -5.5c0 -1.46 0.57 -2.79 1.5 -3.77c0.3 -0.32 0.5 -0.73 0.5 -1.23c0 -0.5 -0.22 -1.12 -0.5 -1.5c-0.63 -0.84 -1 -1.87 -1 -3c0 -2.76 2 -5 5 -5Z"
          stroke="#fff"
          strokeWidth={2}
          fill="none"
          strokeDasharray="56"
          strokeDashoffset={peanutAnim}
        />
        <G transform="rotate(45 12 12)">
          <AnimatedPath
            d="M-1 11h24"
            stroke="#fff"
            strokeWidth={2}
            fill="none"
            strokeDasharray="28"
            strokeDashoffset={lineAnim}
          />
        </G>
      </Svg>
      {/* White Text */}
      <Text style={styles.text}>Let's Eat!</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    marginTop: 0,
    fontSize: 54,
    fontFamily: 'ReadexPro-Bold',
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    zIndex: 1,
  },
});

export default Welcome;
