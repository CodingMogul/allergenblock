export type RootStackParamList = {
  Login: undefined;
  Allergen: undefined;
  Home: { photoUri?: string } | undefined;
  Menu: { restaurantId: string; restaurantName: string };
  Profile: undefined;
  InstructionPage: { fromHelp?: boolean } | undefined;
  ProfileSetup: { canGoBack?: boolean; fromOnboarding?: boolean } | undefined;
  Welcome: undefined;
  Camera: undefined;
  OnboardingCarouselDemo: undefined;
  OnboardingScanDemo: undefined;
}; 