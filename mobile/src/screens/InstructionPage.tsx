import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';

export default function InstructionPage() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const titlePosition = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const lastStepOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  
  const windowHeight = Dimensions.get('window').height;
  const centerPosition = (windowHeight / 2) - 250; // Increased from 150 to 250 to move it higher

  const handleContinue = () => {
    if ((route as any).params?.fromHelp) {
      navigation.navigate('Home');
    } else if ((route as any).params?.fromOnboarding) {
      navigation.navigate('ProfileSetup', { fromOnboarding: true });
    } else {
      navigation.navigate('Home');
    }
  };

  useEffect(() => {
    // 1. Fade in title in center
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();

    // 2. Wait 2.5 seconds, then move title to top
    setTimeout(() => {
      Animated.timing(titlePosition, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // 3. After title moves, fade in steps
    setTimeout(() => {
      Animated.timing(stepsOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, 1400);

    // 4. Finally, fade in last step
    setTimeout(() => {
      Animated.timing(lastStepOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, 2200);

    // 5. Fade in continue button 0.5s after last step
    setTimeout(() => {
      Animated.timing(continueButtonOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, 2800); // 2200 + 600ms
  }, []);

  const titleTranslateY = titlePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [centerPosition, 0]
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text 
          style={[
            styles.title,
            {
              transform: [{ translateY: titleTranslateY }],
              opacity: titleOpacity
            }
          ]}
        >
          How it Works
        </Animated.Text>
        
        <Animated.View style={[styles.stepsContainer, { opacity: stepsOpacity }]}>
          <Text style={styles.step}>Set up your <Text style={styles.bold}>allergy profile</Text></Text>
          <Text style={styles.step}><Text style={styles.bold}>Take a photo</Text> of any menu 📸</Text>
          <Text style={styles.step}><Text style={styles.bold}>AI</Text> scans the menu and <Text style={styles.bold}>identifies allergens</Text></Text>
          <Text style={styles.step}>Get <Text style={styles.bold}>personalized allergen information</Text></Text>
        </Animated.View>
        
        <Animated.View style={[styles.stepsContainer, { opacity: lastStepOpacity }]}>
          <Text style={[styles.step, styles.lastStep]}><Text style={styles.bold}>Enjoy your meal with confidence!</Text></Text>
        </Animated.View>

        <Animated.View style={[styles.bottomButtonContainer, { opacity: continueButtonOpacity }]}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 70,
    flex: 1,
  },
  title: {
    fontSize: 42,
    fontFamily: 'ReadexPro-Bold',
    color: '#DA291C',
    marginTop: 100,
    marginBottom: 60,
    textAlign: 'center',
  },
  stepsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  step: {
    fontSize: 24,
    fontFamily: 'ReadexPro-Regular',
    color: '#222',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 32,
  },
  bold: {
    fontFamily: 'ReadexPro-Bold',
    fontWeight: '900',
  },
  lastStep: {
    color: '#DA291C',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
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
    fontFamily: 'ReadexPro-Bold',
  },
}); 