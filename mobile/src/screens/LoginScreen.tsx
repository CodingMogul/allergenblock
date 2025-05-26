import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { Video, ResizeMode } from 'expo-av';

export default function TitleScreen() {
  const logoTitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonFade = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showContinue, setShowContinue] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [videoUri, setVideoUri] = React.useState<string | null>(null);
  const continueTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload video asset for onboarding
  useEffect(() => {
    const videoModule = require('../assets/OnboardTakePhoto.mp4');
    Asset.loadAsync(videoModule).then(() => {
      const asset = Asset.fromModule(videoModule);
      setVideoUri(asset.uri);
    });
  }, []);

  // Show continue button 1.2s after video is ready
  useEffect(() => {
    if (videoReady) {
      continueTimerRef.current = setTimeout(() => {
        setShowContinue(true);
        Animated.timing(continueButtonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 1200);
    } else {
      setShowContinue(false);
      continueButtonFade.setValue(0);
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    }
    return () => {
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    };
  }, [videoReady]);

  useEffect(() => {
    // Fade in logo and title together
    Animated.timing(logoTitleOpacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();

    // Fade in subtitle after 1s
    const subtitleTimeout = setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => {
      clearTimeout(subtitleTimeout);
    };
  }, []);

  const handleContinue = async () => {
    navigation.navigate('OnboardingCarouselDemo' as any, { preloadedVideoUri: videoUri });
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
      {showContinue && (
        <Animated.View style={[styles.bottomButtonContainer, { opacity: continueButtonFade }]}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {/* Preload video invisibly for caching */}
      {videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
          isMuted
          shouldPlay={false}
          resizeMode={ResizeMode.CONTAIN}
          onLoad={() => setVideoReady(true)}
        />
      )}
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
    fontFamily: 'ReadexPro-Regular',
    textAlign: 'center',
    marginTop: 32,
    color: '#222',
  },
  bottomButtonContainer: {
    marginTop: 40,
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
    fontFamily: 'ReadexPro-Regular',
  },
});