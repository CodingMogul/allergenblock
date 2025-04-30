export type RootStackParamList = {
  Login: undefined;
  Allergen: undefined;
  Home: undefined;
  Menu: { restaurantId: string; restaurantName: string };
  Profile: undefined;
  InstructionPage: undefined;
  ProfileSetup: { canGoBack?: boolean } | undefined;
  Welcome: undefined;
  Camera: undefined;
}; 