import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PeanutOutline from '../../assets/icons/PeanutOutline.svg';
import Milk from '../../assets/icons/Milk.svg';
import Eggs from '../../assets/icons/Eggs.svg';
import FishOutline from '../../assets/icons/FishOutline.svg';
import Shrimp from '../../assets/icons/Shrimp.svg';
import TreePine from '../../assets/icons/TreePine.svg';
import Bread from '../../assets/icons/Bread.svg';
import Beans from '../../assets/icons/Beans.svg';
import Sesame from '../../assets/icons/Sesame.svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screens/types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import { Video, ResizeMode } from 'expo-av';

const ALLERGENS = [
  { id: 'dairy', name: 'Dairy' },
  { id: 'eggs', name: 'Eggs' },
  { id: 'peanuts', name: 'Peanuts' },
  { id: 'treenuts', name: 'Tree Nuts' },
  { id: 'shellfish', name: 'Shellfish' },
  { id: 'fish', name: 'Fish' },
  { id: 'gluten', name: 'Gluten' },
  { id: 'soy', name: 'Soy' },
  { id: 'sesame', name: 'Sesame' },
];

const allergenIcons = {
  peanut: PeanutOutline,
  milk: Milk,
  egg: Eggs,
  eggs: Eggs,
  fish: FishOutline,
  shellfish: Shrimp,
  'tree nut': TreePine,
  'tree nuts': TreePine,
  gluten: Bread,
  wheat: Bread,
  soy: Beans,
  sesame: Sesame,
  dairy: Milk,
  treenuts: TreePine,
  peanuts: PeanutOutline,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const videoModule = require('../assets/OnboardTakePhoto.mp4');

export default function OnboardingCarouselDemo() {
  const carouselRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [highlighted, setHighlighted] = useState(true);
  const continueFade = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const preloadedVideoUri = (route as any).params?.preloadedVideoUri;
  const [videoReady, setVideoReady] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(preloadedVideoUri || null);
  const videoRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isMountedRef = useRef(true);
  const hapticTimeouts: number[] = [];
  const fromHelp = (route as any).params?.fromHelp;
  const continueTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelLoop = () => {
    isMountedRef.current = false;
    hapticTimeouts.forEach(t => clearTimeout(t));
  };

  useEffect(() => {
    isMountedRef.current = true;
    let i = 0;
    const sleep = (ms: number) => new Promise<void>(res => {
      const t = setTimeout(res, ms);
      hapticTimeouts.push(t);
    });
    const loop = async () => {
      while (isMountedRef.current) {
        carouselRef.current?.scrollTo({ index: i, animated: true });
        setCurrentIndex(i);
        setHighlighted(false);
        await sleep(1000); // 1s pause after swipe
        setHighlighted(true);
        if (isMountedRef.current) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await sleep(1500); // 1.5s highlight
        setHighlighted(false);
        if (i === ALLERGENS.length - 1) {
          // Dissolve/fade out, jump, then fade in
          Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(async () => {
            await sleep(100);
            carouselRef.current?.scrollTo({ index: 0, animated: false });
            setCurrentIndex(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
          });
          i = 0;
          await sleep(700); // Wait for fade in
        } else {
          i = i + 1;
        }
      }
    };
    loop();
    return () => { isMountedRef.current = false; };
  }, []);

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

  // Show continue button 1.2s after video is ready
  useEffect(() => {
    if (videoReady) {
      const timer = setTimeout(() => {
        setShowContinue(true);
        Animated.timing(continueFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1200);
    } else {
      setShowContinue(false);
      continueFade.setValue(0);
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    }
    return () => {
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    };
  }, [videoReady]);

  const handleContinue = () => {
    cancelLoop();
    setTimeout(() => {
      (navigation as any).navigate('OnboardingScanDemo', { preloadedVideoUri: videoUri, fromHelp });
    }, 50);
  };

  const handleSkip = () => {
    cancelLoop();
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      {/* Home button centered above title if fromHelp */}
      {fromHelp && (
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', top: 60, zIndex: 101 }}>
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
      <Text style={styles.title}>What do you avoid?</Text>
      <Text style={styles.subtitle}>Pick your allergens so we can filter menus for you</Text>
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Carousel
            ref={carouselRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            data={ALLERGENS}
            loop={false}
            autoPlay={false}
            mode="parallax"
            modeConfig={{ parallaxScrollingScale: 0.85, parallaxScrollingOffset: 60 }}
            snapEnabled={true}
            onSnapToItem={setCurrentIndex}
            renderItem={({ item, index }) => {
              let iconKey = item.id.toLowerCase();
              if (iconKey === 'peanuts') iconKey = 'peanut';
              if (iconKey === 'treenuts') iconKey = 'tree nuts';
              if (iconKey === 'eggs' || iconKey === 'egg') iconKey = 'eggs';
              if (iconKey === 'shellfish') iconKey = 'shellfish';
              if (iconKey === 'dairy' || iconKey === 'milk') iconKey = 'milk';
              if (iconKey === 'gluten' || iconKey === 'wheat') iconKey = 'gluten';
              if (iconKey === 'soy') iconKey = 'soy';
              if (iconKey === 'sesame') iconKey = 'sesame';
              const Icon = allergenIcons[iconKey as keyof typeof allergenIcons];
              const isCentered = index === currentIndex;
              return (
                <View style={[
                  styles.carouselCard,
                  isCentered && highlighted && styles.carouselCardSelected
                ]}>
                  {Icon && <Icon width="80%" height="80%" />}
                  <Text style={styles.cardText}>{item.name}</Text>
                  {isCentered && highlighted && (
                    <Feather
                      name="check-circle"
                      size={24}
                      color="#DA291C"
                      style={{ position: 'absolute', top: 10, right: 10 }}
                    />
                  )}
                </View>
              );
            }}
            enabled={false}
            scrollAnimationDuration={400}
          />
        </Animated.View>
        {/* LinearGradient overlays for left/right fade */}
        <LinearGradient
          colors={['#fff', 'rgba(255,255,255,0)']}
          style={styles.leftGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', '#fff']}
          style={styles.rightGradient}
          pointerEvents="none"
        />
      </View>
      {/* Continue button overlay, absolute and centered */}
      <Animated.View style={{
        opacity: continueFade,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 150,
        alignItems: 'center',
        zIndex: 100,
      }} pointerEvents={showContinue ? 'auto' : 'none'}>
        {showContinue && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Scan a menu →</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      {/* Preload video invisibly for caching and set videoReady */}
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
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#DA291C', marginBottom: 12, textAlign: 'center', fontFamily: 'ReadexPro-Bold' },
  subtitle: { fontSize: 16, color: '#222', marginBottom: 24, textAlign: 'center', fontFamily: 'ReadexPro-Regular' },
  carouselCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 10,
    position: 'relative',
  },
  carouselCardSelected: {
    backgroundColor: '#ffeaea',
    borderWidth: 2,
    borderColor: '#DA291C',
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
    fontFamily: 'ReadexPro-Regular',
  },
  continueButton: {
    marginTop: 30,
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
  continueButtonText: {
    color: '#DA291C',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: '18%',
    bottom: '18%',
    width: 40,
    zIndex: 10,
  },
  rightGradient: {
    position: 'absolute',
    right: 0,
    top: '18%',
    bottom: '18%',
    width: 40,
    zIndex: 10,
  },
}); 