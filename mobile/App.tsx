// ✅ App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from './MenuScreen';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';
import { RootStackParamList } from './types/navigation';
import LoginScreen from './LoginScreen';
import AllergenScreen from './AllergenScreen';
import InstructionPage from './InstructionPage';
import ProfileSetup from './ProfileSetup';
import WelcomeScreen from './WelcomeScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
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
          options={{ title: 'Allergen' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Restaurants' }}
        />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ title: 'Menu' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Your Profile' }}
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
          options={{
            title: 'Profile Setup',
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontFamily: 'Inter-Medium',
            },
            gestureEnabled: false,
          }}
        />
        <Stack.Screen 
          name="Welcome"
          component={WelcomeScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
