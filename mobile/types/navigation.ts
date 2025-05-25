export type RootStackParamList = {
  Login: undefined;
  Allergen: undefined;
  Home: { photoUri?: string } | undefined;
  Menu: { restaurantId: string; restaurantName: string; photoUri?: string };
  Profile: undefined;
  InstructionPage: undefined;
  ProfileSetup: { canGoBack?: boolean } | undefined;
  Welcome: undefined;
  Camera: undefined;
}; 