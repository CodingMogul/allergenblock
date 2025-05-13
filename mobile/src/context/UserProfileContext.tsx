import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  firstName: string;
  lastName: string;
  allergens: string[];
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  allergens: [],
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    AsyncStorage.getItem('userProfile').then(data => {
      if (data) setProfile(JSON.parse(data));
    });
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
  };

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider');
  return ctx;
} 