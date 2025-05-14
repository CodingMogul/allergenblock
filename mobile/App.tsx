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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);

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

  if (!initialRoute) return null; // or a splash/loading screen

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProfileProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute as any}>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Allergen"
              component={AllergenScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerShown: false,
                headerBackVisible: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Menu"
              component={MenuScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="InstructionPage"
              component={InstructionPage}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen 
              name="ProfileSetup"
              component={ProfileSetup}
              options={({ route }) => ({
                headerShown: false,
                gestureEnabled: !!route.params?.canGoBack,
                headerBackVisible: !!route.params?.canGoBack,
              })}
            />
            <Stack.Screen 
              name="Welcome"
              component={WelcomeScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </UserProfileProvider>
    </GestureHandlerRootView>
  );
}
