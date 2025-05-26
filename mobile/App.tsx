// ✅ App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types/navigation';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetup from './src/screens/ProfileSetup';
import CameraScreen from './src/screens/CameraScreen';
import OnboardingCarouselDemo from './src/screens/OnboardingCarouselDemo';
import OnboardingScanDemo from './src/screens/OnboardingScanDemo';
import OnboardingAddMenu from './src/screens/OnboardingAddMenu';
import { UserProfileProvider } from './src/context/UserProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import { View, Text, Button, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import Welcome from './src/screens/Welcome';
import SplashScreen from './src/screens/SplashScreen';
import { OnboardingVideoProvider } from './src/context/OnboardingVideoContext';

const Stack = createStackNavigator();

// Add clearAsyncStorage debug function
const clearAsyncStorage = async () => {
  await AsyncStorage.clear();
  alert('AsyncStorage cleared!');
};

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    'ReadexPro-Regular': require('./assets/fonts/ReadexPro-Regular.ttf'),
    'ReadexPro-Bold': require('./assets/fonts/ReadexPro-Bold.ttf'),
  });
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);
  const [showSplash, setShowSplash] = React.useState(false);

  // --- UPDATED NAVIGATION LOGIC ---
  React.useEffect(() => {
    (async () => {
      try {
        const profileStr = await AsyncStorage.getItem('userProfile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile && Array.isArray(profile.allergens) && profile.allergens.length > 0) {
            setShowSplash(true);
            setInitialRoute('Splash');
          } else {
            setInitialRoute('Login');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch {
        setInitialRoute('Login');
      }
    })();
  }, []);

  if (!fontsLoaded || !initialRoute) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Loading fonts...</Text></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* DEBUG: Remove this block to hide the clear AsyncStorage button */}
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 40, left: 0, right: 0, zIndex: 9999, alignItems: 'center' }}>
          <Button title="Clear AsyncStorage" color="#DA291C" onPress={clearAsyncStorage} />
        </View>
      )}
      {/* END DEBUG: Clear AsyncStorage button */}
      <OnboardingVideoProvider>
        <UserProfileProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={initialRoute}
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#fff' },
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OnboardingCarouselDemo" component={OnboardingCarouselDemo} />
              <Stack.Screen name="OnboardingScanDemo" component={OnboardingScanDemo} />
              <Stack.Screen name="OnboardingAddMenu" component={OnboardingAddMenu} />
              <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
              <Stack.Screen name="Camera" component={CameraScreen} />
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        opacity: current.progress,
                      },
                    };
                  },
                }}
              />
              <Stack.Screen name="Menu" component={MenuScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </UserProfileProvider>
      </OnboardingVideoProvider>
    </GestureHandlerRootView>
  );
}
