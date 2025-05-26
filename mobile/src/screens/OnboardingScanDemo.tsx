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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(width * 0.9, 360);
const VIDEO_HEIGHT = VIDEO_WIDTH * (934 / 475);

const OnboardingScanDemo = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;
  const line1Fade = useRef(new Animated.Value(0)).current;
  const line2Fade = useRef(new Animated.Value(0)).current;
  const [videoReady, setVideoReady] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const continueFade = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<any>(null);
  const [showText, setShowText] = useState(true);

  // Animation state
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(0)).current;
  const videoSlide = useRef(new Animated.Value(600)).current;

  const preloadedVideoUri = (route as any).params?.preloadedVideoUri;
  const preloadedVideoPosition = (route as any).params?.preloadedVideoPosition || 0;
  const videoUri = preloadedVideoUri || Asset.fromModule(require('../assets/OnboardTakePhoto.mp4')).uri;

  // Seek to preloaded position on load
  const onVideoLoad = async () => {
    setVideoReady(true);
    if (videoRef.current && preloadedVideoPosition > 0) {
      try {
        await videoRef.current.setPositionAsync(preloadedVideoPosition, { toleranceMillis: 100 });
        await videoRef.current.playAsync();
      } catch (e) {}
    }
  };

  // Animation sequence
  useEffect(() => {
    if (videoReady) {
      setLoading(false);
      // Delay the whole sequence by 1.5s
      setTimeout(() => {
        // 1. Title fade in (center, quicker)
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          // 2. Hold title on screen longer before subtitle fades in
          setTimeout(() => {
            Animated.timing(subtitleFade, {
              toValue: 1,
              duration: 1100,
              useNativeDriver: true,
            }).start(() => {
              // 3. Pause, then slide both text and video up together
              setTimeout(() => {
                Animated.timing(textSlide, {
                  toValue: 1,
                  duration: 800,
                  easing: Easing.inOut(Easing.exp),
                  useNativeDriver: true,
                }).start(() => {
                  // 4. Wait 0.5s, then show continue button
                  setTimeout(() => {
                    setShowContinue(true);
                    Animated.timing(continueFade, {
                      toValue: 1,
                      duration: 400,
                      useNativeDriver: true,
                    }).start();
                  }, 500);
                });
              }, 200);
            });
          }, 1200); // Hold title for 1200ms before subtitle fade in
        });
      }, 1500);
    }
  }, [videoReady]);

  // Fade in the video when ready
  useEffect(() => {
    if (videoReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [videoReady]);

  // Pause 1.5s at end, then loop
  const handleVideoStatus = async (status: any) => {
    if (status.didJustFinish && videoRef.current) {
      await videoRef.current.pauseAsync();
      // Do not restart playback, just leave paused
    }
  };

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
                  translateY: textSlide.interpolate({
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
        opacity: fadeAnim,
        transform: [{
          translateY: textSlide.interpolate({
            inputRange: [0, 1],
            outputRange: [600, 0],
            extrapolate: 'clamp',
          })
        }],
        alignItems: 'center',
        marginBottom: 0,
      }}>
        {videoUri && (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            isMuted
            shouldPlay={true}
            onLoad={onVideoLoad}
            onPlaybackStatusUpdate={handleVideoStatus}
            onError={(e) => console.log('Video error', e)}
          />
        )}
      </Animated.View>

      {/* Continue Button under subtitle, inside animated text group */}
      <Animated.View
        style={{
          opacity: continueFade,
          position: 'absolute',
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
          transform: [
            {
              translateY: textSlide.interpolate({
                inputRange: [0, 1],
                outputRange: [ (Dimensions.get('window').height - 120) / 2 + 120, 240 ],
                extrapolate: 'clamp',
              })
            }
          ],
        }}
        pointerEvents={showContinue ? 'auto' : 'none'}
      >
        {showContinue && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              setShowText(false);
              (navigation as any).navigate('OnboardingAddMenu', { fromOnboarding: true });
            }}
          >
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
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
    marginTop: 20,
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
