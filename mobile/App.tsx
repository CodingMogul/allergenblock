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
import { View, Text, Button, Alert, TouchableOpacity } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import Welcome from './src/screens/Welcome';
import SplashScreen from './src/screens/SplashScreen';
import { OnboardingVideoProvider } from './src/context/OnboardingVideoContext';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    'ReadexPro-Regular': require('./assets/fonts/ReadexPro-Regular.ttf'),
    'ReadexPro-Bold': require('./assets/fonts/ReadexPro-Bold.ttf'),
  });
  const [initialRoute, setInitialRoute] = React.useState<keyof RootStackParamList | null>(null);
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

  // ===== DEBUG: CLEAR ASYNC STORAGE BUTTON (REMOVE THIS BLOCK WHEN DONE) =====
  const handleClearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('AsyncStorage cleared!');
      // Optionally reload the app (uncomment if desired):
      // Updates.reloadAsync();
    } catch (e) {
      Alert.alert('Failed to clear AsyncStorage');
    }
  };
  // ===== END DEBUG BLOCK =====

  if (!fontsLoaded || !initialRoute) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Loading fonts...</Text></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
              <Stack.Screen name="Splash" component={SplashScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="Login" component={LoginScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="OnboardingCarouselDemo" component={OnboardingCarouselDemo} options={{ gestureEnabled: false }} />
              <Stack.Screen name="OnboardingScanDemo" component={OnboardingScanDemo} options={{ gestureEnabled: false }} />
              <Stack.Screen name="OnboardingAddMenu" component={OnboardingAddMenu} options={{ gestureEnabled: false }} />
              <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ gestureEnabled: false }} />
              <Stack.Screen name="Camera" component={CameraScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="Welcome" component={Welcome} options={{ gestureEnabled: false }} />
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{
                  gestureEnabled: false,
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        opacity: current.progress,
                      },
                    };
                  },
                }}
              />
              <Stack.Screen name="Menu" component={MenuScreen} options={{ gestureEnabled: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </UserProfileProvider>
      </OnboardingVideoProvider>
    </GestureHandlerRootView>
  );
}
