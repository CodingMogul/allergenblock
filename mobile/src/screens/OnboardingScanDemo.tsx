import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screens/types/navigation';
import { Asset } from 'expo-asset';
import { Video, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(width * 0.9, 360);
const VIDEO_HEIGHT = VIDEO_WIDTH * (934 / 475);

const OnboardingScanDemo = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const line1Fade = useRef(new Animated.Value(0)).current;
  const line2Fade = useRef(new Animated.Value(0)).current;
  const [videoReady, setVideoReady] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const continueFade = useRef(new Animated.Value(0)).current;
  const [slideUpComplete, setSlideUpComplete] = useState(false);
  const videoRef = useRef<any>(null);
  const [showText, setShowText] = useState(true);

  // Animation state
  const [isReady, setIsReady] = useState(false);
  const visibleVideoRef = useRef<any>(null);
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const [subtitleDone, setSubtitleDone] = useState(false);

  const preloadedVideoUri = (route as any).params?.preloadedVideoUri;
  const [videoUri, setVideoUri] = useState<string | null>(preloadedVideoUri || null);
  const fromHelp = (route as any).params?.fromHelp;

  // If not preloaded, load the video asset
  useEffect(() => {
    if (!videoUri) {
      const videoModule = require('../assets/OnboardTakePhoto.mp4');
      Asset.loadAsync(videoModule).then(() => {
        const asset = Asset.fromModule(videoModule);
        setVideoUri(asset.uri);
      });
    }
  }, []);

  // Animation: only slide up the video when ready
  useEffect(() => {
    if (isReady) {
      fadeAnim.setValue(1);
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }).start(() => setSlideUpComplete(true));
      }, 150);
    }
  }, [isReady]);

  // Show continue button 2s after slide-up animation completes
  useEffect(() => {
    if (slideUpComplete) {
      const timer = setTimeout(() => {
        setShowContinue(true);
        Animated.timing(continueFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [slideUpComplete]);

  // Skip button handler
  const handleSkip = () => {
    navigation.navigate('Home');
  };

  // Debug: log videoUri
  console.log('OnboardingScanDemo videoUri', videoUri);

  return (
    <View style={styles.container}>
      {/* Home button centered above title if fromHelp */}
      {fromHelp && (
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', top: 60, zIndex: 21 }}>
          <TouchableOpacity onPress={handleSkip} style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}>
            <Feather name="home" size={28} color="#DA291C" />
          </TouchableOpacity>
        </View>
      )}
      {/* Title and subtitle always visible, no animation */}
      <View style={[styles.topSection, { position: 'absolute', left: 0, right: 0, width: '100%', alignItems: 'center', zIndex: 10 }]}> 
        <Text style={styles.title}>Scan real menus</Text>
        <Text style={styles.subtitle}>Take a photo of any menu. AI will flag unsafe items based on your profile.</Text>
        {/* Continue button 35px below subtitle */}
        <Animated.View style={{ opacity: continueFade, marginTop: 35, alignItems: 'center', alignSelf: 'center' }} pointerEvents={showContinue ? 'auto' : 'none'}>
          {showContinue && (
            <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('OnboardingAddMenu' as any, { preloadedVideoUri: videoUri, fromHelp })}>
              <Text style={styles.continueButtonText}>See Your Safe Menu →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* Video */}
      <Animated.View style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: (width - VIDEO_WIDTH) / 2,
        alignItems: 'center',
        marginBottom: 0,
        opacity: fadeAnim,
        // Slide in from below after text slides up (use slideAnim)
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [Dimensions.get('window').height, 290],
            })
          }
        ],
      }}>
        {videoUri ? (
          <Video
            ref={visibleVideoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={true}
            shouldPlay={true}
            onLoad={() => setIsReady(true)}
            onError={(e) => console.log('Video error', e)}
          />
        ) : (
          <Text style={{ color: 'red', marginTop: 40 }}>No video URI loaded</Text>
        )}
      </Animated.View>
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
    marginTop: 150,
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
    marginTop: -25,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 180,
    minHeight: 48,
    alignSelf: 'center',
  },
  continueButtonText: {
    color: '#DA291C',
    fontSize: 20,
    fontFamily: 'ReadexPro-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
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
