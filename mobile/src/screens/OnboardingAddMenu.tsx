import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screens/types/navigation';
import { Video, ResizeMode } from 'expo-av';
import { useAnimatedScrollHandler } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// --- AnimatedMagnifierPeanut (from HomeScreen) ---
const AnimatedMagnifierPeanut = () => {
  const [angle, setAngle] = useState(0);
  const iconSize = 120;
  const radius = 36;

  useEffect(() => {
    let running = true;
    let start = Date.now();
    function animate() {
      if (!running) return;
      const now = Date.now();
      const t = ((now - start) % 2000) / 2000; // 2s loop
      setAngle(t * 2 * Math.PI);
      requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return (
    <View style={{ width: iconSize * 2, height: iconSize * 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -iconSize / 2 + x, marginTop: -iconSize / 2 + y }}>
        <FontAwesome5 name="search" size={iconSize} color="#DA291C" solid style={{ fontWeight: 'bold' }} />
      </View>
    </View>
  );
};

// --- FadeInCheck (from HomeScreen) ---
const FadeInCheck = ({ visible }: { visible: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);
  return (
    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="check" size={100} color="#22c55e" style={{ fontWeight: 'bold' }} />
      <Text style={{ marginTop: 24, fontSize: 32, color: '#22c55e', fontWeight: 'bold', letterSpacing: 1, fontFamily: 'ReadexPro-Bold' }}>Success!</Text>
    </Animated.View>
  );
};

// Copy relevant styles from MenuScreen
const menuCardStyles = StyleSheet.create({
  menuCard: {
    width: width - 48,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  menuCardContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  menuTextCenterer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  menuItemName: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 0,
    fontFamily: 'ReadexPro-Regular',
  },
  allergenListContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuItemAllergensExpanded: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'ReadexPro-Bold',
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'ReadexPro-Regular',
  },
});

const FakeMenuCard = ({ onExpand }: { onExpand: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const cancelRef = useRef({ cancelled: false, timeouts: [] as any[] });

  useEffect(() => {
    cancelRef.current.cancelled = false;

    const tapTimeout = setTimeout(() => {
      if (cancelRef.current.cancelled) return;

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 120,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        if (cancelRef.current.cancelled) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setExpanded(true);
        Animated.timing(expandAnim, {
          toValue: 1,
          duration: 10,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }).start(() => {
          const expandTimeout = setTimeout(() => {
            if (!cancelRef.current.cancelled) onExpand();
          }, 1000);
          cancelRef.current.timeouts.push(expandTimeout);
        });
      });
    }, 1200);

    cancelRef.current.timeouts.push(tapTimeout);

    return () => {
      cancelRef.current.cancelled = true;
      cancelRef.current.timeouts.forEach(clearTimeout);
      cancelRef.current.timeouts = [];
    };
  }, []);

  // Fake menu item data
  const item: {
    name: string;
    ingredients: string;
    allergens: string[];
    allergenIngredients: Record<string, string[]>;
  } = {
    name: 'Pad Thai',
    ingredients: 'Noodles, tofu, peanuts, egg',
    allergens: ['Peanut'],
    allergenIngredients: { Peanut: ['peanuts', 'sauce'] },
  };
  const matchCount = 1; // For demo, always 1 allergen

  return (
    <Animated.View style={[menuCardStyles.menuCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ scale: scaleAnim }] }]}> 
      <View style={{ flex: 1, minHeight: expanded ? 160 : 100, justifyContent: 'center' }}>
        <View style={menuCardStyles.menuTextCenterer}>
          <Text style={[menuCardStyles.menuItemName, { fontFamily: 'ReadexPro-Regular' }]}>{item.name}</Text>
          {item.ingredients && (
            <Text style={{ fontSize: 16, color: '#666', marginTop: 8, fontFamily: 'ReadexPro-Regular', textAlign: 'center' }}>{item.ingredients}</Text>
          )}
        </View>
        {expanded && (
          <Animated.View style={{
            marginTop: 8,
            opacity: expandAnim,
            width: '100%',
            alignItems: 'center',
          }}>
            <View style={menuCardStyles.allergenListContainer}>
              <View style={menuCardStyles.allergenRow}>
                <Text style={[menuCardStyles.menuItemAllergensExpanded, { fontSize: 18, fontFamily: 'ReadexPro-Bold' }]}>Contains:</Text>
                {item.allergens.map((allergen, i) => (
                  <View key={i} style={{ flexDirection: 'column', alignItems: 'center', backgroundColor: '#ffeaea', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}>
                    <Text style={[menuCardStyles.allergenText, { fontSize: 18, color: '#DA291C', fontWeight: 'bold', fontFamily: 'ReadexPro-Bold' }]}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </View>
      {/* Allergen tally square (red box) */}
      {!expanded && (
        <TouchableOpacity
          style={styles.iconContainer}
          activeOpacity={1}
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor: matchCount > 0 ? '#ff4d4d' : '#4CAF50',
              }
            ]}
          >
            {matchCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {Array.from({ length: matchCount }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      backgroundColor: '#fff',
                      marginHorizontal: 1,
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const PermissionLine = ({ label, active, granted, dotsAnim }: { label: string; active: boolean; granted: boolean; dotsAnim: Animated.Value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
    <Text style={{ fontSize: 20, fontFamily: 'ReadexPro-Bold', color: '#222', width: 180 }}>{label}</Text>
    {granted ? (
      <Feather name="check" size={28} color="#111" style={{ marginLeft: 12 }} />
    ) : active ? (
      <Animated.View style={{ marginLeft: 12, flexDirection: 'row', transform: [{ translateY: dotsAnim }] }}>
        <Dot color="#222" />
        <Dot color="#222" style={{ marginLeft: 2 }} />
        <Dot color="#222" style={{ marginLeft: 2 }} />
      </Animated.View>
    ) : (
      <View style={{ width: 40, height: 28 }} />
    )}
  </View>
);

const Dot = ({ color, style }: { color: string; style?: any }) => (
  <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />
);

const OnboardingAddMenu = () => {
  const [step, setStep] = useState<'magnifier' | 'check' | 'card'>('magnifier');
  const [loopKey, setLoopKey] = useState(0); // for resetting card animation
  const fadeAnim = useRef(new Animated.Value(1)).current; // controls crossfade
  const checkAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [cardActive, setCardActive] = useState(false); // ensure card stays visible
  const [continueVisible, setContinueVisible] = useState(true); // track if continue button should stay visible
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionStep, setPermissionStep] = useState<'camera' | 'location' | 'done'>('camera');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [dotsAnimCamera] = useState(new Animated.Value(0));
  const [dotsAnimLocation] = useState(new Animated.Value(0));
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [textFadeAnim] = useState(new Animated.Value(1));
  const route = useRoute();
  const fromHelp = (route as any).params?.fromHelp;
  const preloadedVideoUri = (route as any).params?.preloadedVideoUri;
  const cancelRef = useRef({ cancelled: false, timeouts: [] as any[] });
  const continueFade = useRef(new Animated.Value(0)).current;

  // Animate in/out for each step
  useEffect(() => {
    let t1: any, t2: any;
    if (step === 'magnifier') {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(checkAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(cardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setCardActive(false);
      t1 = setTimeout(() => setStep('check'), 2500); // 2.5s for magnifier
      return () => clearTimeout(t1);
    } else if (step === 'check') {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(checkAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(cardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setCardActive(false);
      t2 = setTimeout(() => {
        setStep('card');
        setCardActive(true);
      }, 1500); // 1.5s for check
      return () => clearTimeout(t2);
    } else if (step === 'card') {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(checkAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(cardAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setCardActive(true);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [step]);

  // Animate dots up and down for the active step only
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (!showPermissionModal) return;
    if (permissionStep === 'camera') {
      dotsAnimCamera.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotsAnimCamera, { toValue: -8, duration: 350, useNativeDriver: true }),
          Animated.timing(dotsAnimCamera, { toValue: 8, duration: 350, useNativeDriver: true }),
          Animated.timing(dotsAnimCamera, { toValue: 0, duration: 350, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else if (permissionStep === 'location') {
      dotsAnimLocation.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotsAnimLocation, { toValue: -8, duration: 350, useNativeDriver: true }),
          Animated.timing(dotsAnimLocation, { toValue: 8, duration: 350, useNativeDriver: true }),
          Animated.timing(dotsAnimLocation, { toValue: 0, duration: 350, useNativeDriver: true }),
        ])
      );
      loop.start();
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [showPermissionModal, permissionStep]);

  // Show continue button 1.2s after card is active
  useEffect(() => {
    if (cardActive) {
      Animated.timing(continueFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      continueFade.setValue(0);
    }
  }, [cardActive]);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const requestCamera = async () => {
    setRequesting(true);
    setPermissionError(null);
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setCameraGranted(true);
      setRequesting(false);
      setTimeout(() => setPermissionStep('location'), 1000); // 1s pause before location
    } else {
      setRequesting(false);
      if (!canAskAgain) {
        setPermissionError('Camera permission is blocked. Please enable it in Settings.');
      } else {
        setPermissionError('Camera permission is required.');
      }
    }
  };

  const requestLocation = async () => {
    setRequesting(true);
    setPermissionError(null);
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      setRequesting(false);
      setTimeout(() => {
        setPermissionStep('done');
        setTimeout(() => {
          setShowPermissionModal(false);
          if (fromHelp) {
            navigation.navigate('Home');
          } else {
            navigation.navigate('ProfileSetup', { fromOnboarding: true });
          }
        }, 1000); // 1s pause before next screen
      }, 0);
      return;
    }
    const { status: reqStatus, canAskAgain: reqCanAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (reqStatus === 'granted') {
      setLocationGranted(true);
      setRequesting(false);
      setTimeout(() => {
        setPermissionStep('done');
        setTimeout(() => {
          setShowPermissionModal(false);
          if (fromHelp) {
            navigation.navigate('Home');
          } else {
            navigation.navigate('ProfileSetup', { fromOnboarding: true });
          }
        }, 1000); // 1s pause before next screen
      }, 0);
    } else {
      setRequesting(false);
      if (!reqCanAskAgain) {
        setPermissionError('Location permission is blocked. Please enable it in Settings.');
      } else {
        setPermissionError('Location permission is required.');
      }
    }
  };

  const handleCardExpand = () => {
    // After card expands, dissolve and loop
    Animated.timing(cardAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setCardActive(false);
      setStep('magnifier');
      setLoopKey(k => k + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  };

  const handleContinue = () => {
    // Stop all ongoing animations and timeouts
    cancelRef.current.cancelled = true;
    cancelRef.current.timeouts.forEach(clearTimeout);
    cancelRef.current.timeouts = [];
    // Fade out title/subtitle
    Animated.timing(textFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTextVisible(false); // Hide them after animation
    });
    setContinueVisible(false); // Hide continue button immediately
    setAnimationPaused(true);
    setShowPermissionModal(true);
    setTimeout(() => {
      setTimeout(() => {
        requestCamera();
      }, 1000); // Wait 1s before checking camera permission
    }, 0);
  };
  

  useEffect(() => {
    if (showPermissionModal) {
      if (permissionStep === 'camera' && !cameraGranted && !requesting) {
        setTimeout(() => {
          requestCamera();
        }, 1000); // Wait 1s before checking camera permission
      } else if (permissionStep === 'location' && !locationGranted && !requesting) {
        setTimeout(() => {
          requestLocation();
        }, 1000); // Wait 1s before checking location permission
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPermissionModal, permissionStep]);

  // Skip button handler
  const handleSkip = () => {
    // Stop all ongoing animations and timeouts
    cancelRef.current.cancelled = true;
    cancelRef.current.timeouts.forEach(clearTimeout);
    cancelRef.current.timeouts = [];
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.topSection, { opacity: textVisible ? textFadeAnim : 0 }]}> 
        <Text style={styles.title}>Custom Allergy Menu</Text>
        <Text style={styles.subtitle}>AI finds your allergens.</Text>
      </Animated.View>
      <View style={styles.centeredContent}>
        {/* Animation Steps */}
        {!animationPaused && (
          <>
            <Animated.View style={{ position: 'absolute', width: '100%', alignItems: 'center', opacity: fadeAnim }} pointerEvents={step === 'magnifier' ? 'auto' : 'none'}>
              <AnimatedMagnifierPeanut />
              <Text style={styles.searchingText}>Searching for allergens...</Text>
            </Animated.View>
            <Animated.View style={{ position: 'absolute', width: '100%', alignItems: 'center', opacity: checkAnim }} pointerEvents={step === 'check' ? 'auto' : 'none'}>
              <FadeInCheck visible={step === 'check'} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', width: '100%', alignItems: 'center', opacity: cardAnim }} pointerEvents={cardActive ? 'auto' : 'none'}>
              {cardActive && <FakeMenuCard key={loopKey} onExpand={handleCardExpand} />}
            </Animated.View>
          </>
        )}
      </View>
      {/* Continue Button at the bottom, always visible except during permission modal */}
      {!showPermissionModal && (
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 180,
          alignItems: 'center',
          zIndex: 100,
        }}>
          <TouchableOpacity
            style={
              fromHelp
                ? {
                    backgroundColor: '#fff',
                    borderRadius: 40,
                    paddingHorizontal: 28,
                    paddingVertical: 6,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : styles.continueButton
            }
            onPress={handleContinue}
          >
            <Text style={fromHelp ? { color: '#DA291C', fontSize: 18, fontFamily: 'ReadexPro-Bold' } : styles.continueButtonText}>
              {fromHelp ? 'Understood!' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Permission Modal */}
      <Modal visible={showPermissionModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <View style={styles.permissionModal}>
              <PermissionLine
                label="Camera permission"
                active={permissionStep === 'camera'}
                granted={cameraGranted}
                dotsAnim={dotsAnimCamera}
              />
              <PermissionLine
                label="Location permission"
                active={permissionStep === 'location'}
                granted={locationGranted}
                dotsAnim={dotsAnimLocation}
              />
              {permissionError && (
                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#DA291C', fontSize: 16, fontFamily: 'ReadexPro-Bold', textAlign: 'center' }}>
                    {permissionError}
                  </Text>
                  <TouchableOpacity
                    onPress={openSettings}
                    style={{
                      marginTop: 12,
                      padding: 10,
                      backgroundColor: '#DA291C',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'ReadexPro-Bold', fontSize: 16 }}>
                      Open Settings
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* Preload video invisibly for caching */}
      {preloadedVideoUri && (
        <Video
          source={{ uri: preloadedVideoUri }}
          style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
          isMuted
          shouldPlay={false}
          resizeMode={ResizeMode.CONTAIN}
          isLooping={true}
        />
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
    color: '#111',
    fontFamily: 'ReadexPro-Regular',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 26,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    height: '100%',
    marginTop: -200,
  },
  searchingText: {
    fontSize: 20,
    color: '#DA291C',
    fontWeight: 'bold',
    marginTop: 32,
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
  },
  continueButton: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 180,
    minHeight: 48,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 20,
    fontFamily: 'ReadexPro-Regular',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    width: 320,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconContainer: {
    marginRight: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingAddMenu; 