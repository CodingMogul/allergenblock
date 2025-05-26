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

  // Animation sequence: title fade in, then subtitle (no slide up here)
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }).start(() => {
          setSubtitleDone(true);
        });
      });
    }, 2750);
    return () => clearTimeout(timer);
  }, []);

  // Slide up both video and text only when both subtitle is done and video is ready
  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady]);

  useEffect(() => {
    if (subtitleDone && isReady) {
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.exp),
          useNativeDriver: true,
        }).start(() => setSlideUpComplete(true));
      }, 2750);
      return () => clearTimeout(timer);
    }
  }, [subtitleDone, isReady]);

  // Show continue button 1.5s after slide-up animation completes
  useEffect(() => {
    if (slideUpComplete) {
      const timer = setTimeout(() => {
        setShowContinue(true);
        Animated.timing(continueFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [slideUpComplete]);

  // Pause 1.5s at end, then loop
  const handleVideoStatus = async (status: any) => {
    if (status.didJustFinish && visibleVideoRef.current) {
      await visibleVideoRef.current.pauseAsync();
      // Do not restart playback, just leave paused
    }
  };

  // Skip button handler
  const handleSkip = () => {
    navigation.navigate('Home');
  };

  // Debug: log videoUri
  console.log('OnboardingScanDemo videoUri', videoUri);

  return (
    <View style={styles.container}>
      {showText && (
        <Animated.View
          style={[
            styles.topSection,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              opacity: titleFade,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [ (Dimensions.get('window').height - 120) / 2, 60 ],
                  })
                }
              ],
            },
          ]}
        >
          <Animated.Text style={[styles.title, { opacity: titleFade }]}>Take a photo.</Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>Get allergen info.</Animated.Text>
        </Animated.View>
      )}

      {/* Video */}
      <Animated.View style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        justifyContent: 'center',
        position: 'absolute',
        top: 290,
        left: (width - VIDEO_WIDTH) / 2,
        alignItems: 'center',
        marginBottom: 0,
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [600, 0],
            extrapolate: 'clamp',
          })
        }],
      }}>
        {videoUri ? (
          <Video
            ref={visibleVideoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            isMuted
            shouldPlay={true}
            onLoad={() => setIsReady(true)}
            onPlaybackStatusUpdate={handleVideoStatus}
            onError={(e) => console.log('Video error', e)}
          />
        ) : (
          <Text style={{ color: 'red', marginTop: 40 }}>No video URI loaded</Text>
        )}
      </Animated.View>

      {/* Continue button under subtitle, fades in after 1.5s */}
      {showContinue && (
        <Animated.View style={{ opacity: continueFade, marginTop: 35, alignItems: 'center', alignSelf: 'center' }}>
          <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('OnboardingAddMenu' as any, { preloadedVideoUri: videoUri, fromHelp })}>
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {/* Skip button in top right if fromHelp */}
      {fromHelp && (
        <TouchableOpacity style={{ position: 'absolute', top: 40, right: 24, zIndex: 20 }} onPress={handleSkip}>
          <Text style={{ color: '#DA291C', fontSize: 18, fontFamily: 'ReadexPro-Bold' }}>Skip</Text>
        </TouchableOpacity>
      )}
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
    marginTop: 150,
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
    color: '#000',
    fontSize: 20,
    fontFamily: 'ReadexPro-Regular',
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
