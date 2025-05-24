// ✅ App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from './src/screens/MenuScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { RootStackParamList } from './types/navigation';
import LoginScreen from './src/screens/LoginScreen';
import AllergenScreen from './src/screens/AllergenScreen';
import InstructionPage from './src/screens/InstructionPage';
import ProfileSetup from './src/screens/ProfileSetup';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import { UserProfileProvider } from './src/context/UserProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import { View, Text, Button, Alert } from 'react-native';

const Stack = createNativeStackNavigator(); // Use non-typed stack for temp single screen

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    'ReadexPro-Regular': require('./assets/fonts/ReadexPro-Regular.ttf'),
    'ReadexPro-Bold': require('./assets/fonts/ReadexPro-Bold.ttf'),
  });
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);

  // Debug: clear AsyncStorage button for onboarding
  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('AsyncStorage cleared!');
    } catch (e) {
      Alert.alert('Failed to clear AsyncStorage');
    }
  };

  // --- ORIGINAL NAVIGATION LOGIC (restore this when done) ---
  React.useEffect(() => {
    (async () => {
      try {
        const profile = await AsyncStorage.getItem('userProfile');
        if (profile) {
          setInitialRoute('Home');
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
      {/* Debug button: remove after onboarding work is done */}
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 40, left: 0, right: 0, zIndex: 9999, alignItems: 'center' }}>
          <Button title="Clear AsyncStorage" color="#DA291C" onPress={clearAsyncStorage} />
        </View>
      )}
      <UserProfileProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute as any} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Allergen" component={AllergenScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="InstructionPage" component={InstructionPage} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </UserProfileProvider>
    </GestureHandlerRootView>
  );
}
