import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(width * 0.9, 360);
const VIDEO_HEIGHT = VIDEO_WIDTH * (934 / 475);

const OnboardingScanDemo = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const videoUri = Asset.fromModule(require('../assets/OnboardTakePhoto.mp4')).uri;

  const handleReady = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Top Text */}
      <View style={styles.topSection}>
        <Text style={styles.title}>Take a photo</Text>
        <Text style={styles.subtitle}>
          Scan your menu. Get the allergen information.
        </Text>
      </View>

      {/* Continue Text Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => (navigation as any).navigate('InstructionPage', { fromOnboarding: true })}
      >
        <Text style={styles.continueButtonText}>Continue →</Text>
      </TouchableOpacity>

      {/* Video */}
      <View style={styles.videoContainer}>
        {loading && (
          <Animated.Image
            source={require('../assets/blank-white-7sn5o1woonmklx1h.jpg')}
            style={[
              styles.placeholder,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
            resizeMode="cover"
          />
        )}
        <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
          <Video
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            isMuted
            shouldPlay
            onReadyForDisplay={handleReady}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
    width: '90%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DA291C',
    fontFamily: 'ReadexPro-Bold',
    marginTop: 80,
    marginBottom: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'ReadexPro-Regular',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 26,
  },
  continueButton: {
    alignSelf: 'center',
    marginTop: 35,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Regular',
    textAlign: 'center',
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    justifyContent: 'center',
    position: 'absolute',
    top: 290,
    bottom: 0,
    alignItems: 'center',
    marginBottom: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 5,
  },
});

export default OnboardingScanDemo;
