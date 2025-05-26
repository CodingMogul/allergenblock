export type RootStackParamList = {
  Login: undefined;
  Allergen: undefined;
  Home: { photoUri?: string } | undefined;
  Menu: { restaurant: { id: string; name: string; apimatch?: string; brandLogo?: string; googlePlace?: { name?: string }; verifiedName?: string } };
  Profile: undefined;
  InstructionPage: { fromHelp?: boolean } | undefined;
  ProfileSetup: { canGoBack?: boolean; fromOnboarding?: boolean } | undefined;
  Welcome: undefined;
  Camera: undefined;
  OnboardingCarouselDemo: { preloadedVideoUri?: string | null; fromHelp?: boolean };
  OnboardingScanDemo: undefined;
}; 