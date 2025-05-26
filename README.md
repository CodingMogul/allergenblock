# AllergenBlock Mobile App

## Overview

AllergenBlock is a React Native app for people with food allergies. It enables users to scan restaurant menus, identify allergens using AI, and manage their allergy profile. The app features a modern onboarding flow, AI-powered menu scanning, and a personalized restaurant/menu experience.

---

## Project Structure

```
mobile/
  App.tsx
  config.ts
  package.json
  tsconfig.json
  assets/
    fonts/
      Readex_Pro/
        static/
        ReadexPro-VariableFont_HEXP,wght.ttf
        [other font weights]
    icons/
      [SVG allergen icons]
  src/
    screens/
      [all screen components, see below]
      types/
        navigation.ts
    context/
      UserProfileContext.tsx
    storage/
      restaurantStorage.ts
    api/
      googleApi.ts
      logoDevApi.ts
    utils/
      editRestaurantShared.ts
    assets/
      [image/video assets]
```

---

## Dependencies

All dependencies are managed via `npm`/`yarn` and listed in `package.json`. Key dependencies:

- **React Native**: UI framework
- **Expo**: App tooling, camera, sensors, file system, haptics, etc.
- **React Navigation**: Stack navigation
- **AsyncStorage**: Persistent storage for user profile and restaurants
- **react-native-svg**: For custom allergen icons
- **react-native-reanimated, react-native-animatable**: Animations
- **expo-camera, expo-image-picker**: Camera and gallery access
- **expo-blur**: Blur overlays
- **expo-location, expo-sensors**: Location and device sensors
- **Custom Fonts**: ReadexPro (all weights included in assets/fonts/Readex_Pro)

**Scripts:**
- `npm start` / `yarn start`: Start Expo dev server
- `npm run android` / `yarn android`: Run on Android
- `npm run ios` / `yarn ios`: Run on iOS
- `npm run web` / `yarn web`: Run web version

**TypeScript:**  
- Strict mode enabled via `tsconfig.json`
- All code is type-safe, with navigation types in `src/screens/types/navigation.ts`

---

## Fonts & Icons

- **Font:** ReadexPro (all weights, variable font included)
  - Registered in `App.tsx` using `expo-font`
  - Used for all headings, subtitles, and UI text
- **Icons:** Allergen icons (SVG) for peanuts, milk, eggs, fish, shellfish, tree nuts, bread, beans, sesame, etc.
  - Used in menu cards and allergen lists

---

## Global Context

- **UserProfileContext** (`src/context/UserProfileContext.tsx`)
  - Provides global user profile state (first name, last name, allergens)
  - Used for onboarding, profile setup, and menu filtering
  - Example usage:
    ```tsx
    import { useUserProfile } from '../context/UserProfileContext';
    const { profile, updateProfile } = useUserProfile();
    ```
  - State is persisted in AsyncStorage under the key `userProfile`.

---

## Persistent Storage

- **restaurantStorage.ts** (`src/storage/restaurantStorage.ts`)
  - Handles saving, editing, deleting, and fetching restaurant/menu data in AsyncStorage
  - Used by HomeScreen, MenuScreen, and onboarding flows
  - Example usage:
    ```ts
    import { getRestaurants, addRestaurant, deleteRestaurant, editRestaurant } from '../storage/restaurantStorage';
    const restaurants = await getRestaurants();
    await addRestaurant(newRestaurant);
    await deleteRestaurant(id);
    await editRestaurant(id, newName, ...);
    ```

---

## API Utilities

- **googleApi.ts**: Fetches Google Place data for restaurant verification
  - `fetchGooglePlace(name: string, location: { lat: number; lng: number })`
    - Returns Google Place data for a given restaurant name and location.
- **logoDevApi.ts**: Fetches brand logos for restaurants
  - `fetchLogoDevUrl(name: string, googleVerifiedName?: string)`
    - Returns a logo URL if the name matches a known brand.
- **editRestaurantShared.ts**: Shared logic for editing restaurant names and details
  - `sharedEditRestaurant({ ... })`
    - Handles Google verification, logo fetching, and updating AsyncStorage.

---

## Configuration

- **config.ts**
  - `BASE_URL`: The backend server URL for API requests. Example:
    ```ts
    export const BASE_URL = 'http://172.16.7.159:3000';
    ```
  - Update this to your local IP or deployed backend as needed.

---

## Navigation Types

Defined in `src/screens/types/navigation.ts`:

```ts
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
  OnboardingCarouselDemo: undefined;
  OnboardingScanDemo: undefined;
};
```

---

## Screens & Their Purpose

### 1. **LoginScreen**
- **Purpose:** Entry point for users. Handles authentication or initial user setup.
- **Key Features:**
  - Animated logo and title fade-in
  - Subtitle and continue button appear after a delay or video preload
  - Preloads onboarding video for a seamless transition
  - Navigates to OnboardingCarouselDemo with video state
- **Props/State:**
  - `showContinue`: Controls visibility of the continue button
  - `videoUri`: Preloaded video asset for onboarding
- **Navigation:**
  - `navigation.navigate('OnboardingCarouselDemo', { preloadedVideoUri, preloadedVideoPosition })`
- **Developer Tip:**
  - Uses `expo-av` for video preloading and playback
  - Uses `Animated` for smooth UI transitions

### 2. **OnboardingCarouselDemo**
- **Purpose:** Carousel-style onboarding that introduces the app's features and value proposition.
- **Key Features:**
  - Animated allergen carousel with SVG icons
  - Haptic feedback on highlight
  - Auto-looping through allergens with fade transitions
  - Continue button to proceed
- **Props/State:**
  - `currentIndex`, `highlighted`: Carousel state
  - `fadeAnim`: Controls fade transitions
- **Navigation:**
  - `navigation.navigate('OnboardingScanDemo', { preloadedVideoUri })`
- **Developer Tip:**
  - Uses `react-native-reanimated-carousel` for smooth carousel
  - Allergen icons are SVGs in `assets/icons/`

### 3. **OnboardingScanDemo**
- **Purpose:** Demonstrates how to scan a menu using the camera. Includes a video animation that slides up after a delay.
- **Key Features:**
  - Animated text and video slide-in
  - Preloaded video resumes from previous state
  - Continue button appears after animation
- **Props/State:**
  - `videoReady`, `showContinue`, `continueFade`: Animation state
- **Navigation:**
  - `navigation.navigate('OnboardingAddMenu')`
- **Developer Tip:**
  - Uses `expo-av` for video
  - Uses `Animated` for slide and fade transitions

### 4. **OnboardingAddMenu**
- **Purpose:** Simulates the process of AI scanning a menu for allergens. Features a looping animation (magnifying glass, check mark, fake menu card) and a "Continue" button (now always visible).
- **Key Features:**
  - Magnifying glass animation (FontAwesome5)
  - Success check mark with "Success!" text
  - Fake menu card animates, expands, and highlights allergens
  - All transitions are smooth and cross-faded
- **Props/State:**
  - `step`: Animation step (magnifier, check, card)
  - `continueVisible`: Controls continue button visibility
- **Navigation:**
  - `navigation.navigate('ProfileSetup', { fromOnboarding: true })`
- **Developer Tip:**
  - Uses `Animated` for all transitions
  - Menu card matches real MenuScreen design

### 5. **ProfileSetup**
- **Purpose:** Lets users select their allergens and set up their allergy profile. Can be accessed from onboarding or from the HomeScreen.
- **Key Features:**
  - Carousel of allergens with SVG icons
  - Select/deselect allergens with haptic feedback
  - Save profile to AsyncStorage
  - Modal for "no allergens" confirmation
- **Props/State:**
  - `selectedAllergens`, `isLoading`, `showSaved`: Profile state
- **Navigation:**
  - `navigation.navigate('Welcome')` (from onboarding)
  - `navigation.replace('Home')` (from HomeScreen)
- **Developer Tip:**
  - Uses `UserProfileContext` for global state
  - All changes are persisted

### 6. **Welcome**
- **Purpose:** Animated welcome screen shown after onboarding/profile setup. Features a custom animation and transitions to HomeScreen.
- **Key Features:**
  - Expanding red circle animation
  - Animated peanut SVG and line
  - Large "Let's Eat!" text
- **Navigation:**
  - `navigation.navigate('Home')` (after animation)
- **Developer Tip:**
  - Uses `Animated` and `react-native-svg` for custom animation

### 7. **HomeScreen**
- **Purpose:** Main app dashboard. Shows a list of restaurants, allows searching, filtering by location, and adding new menu photos.
- **Key Features:**
  - Restaurant list with search and location filter
  - Profile button (top left): Go to ProfileSetup
  - Help button (top right): Go to OnboardingCarouselDemo
  - Camera button (bottom): Go to CameraScreen to add a new menu
  - Tap restaurant card: Go to MenuScreen for that restaurant
- **Props/State:**
  - `restaurants`, `searchText`, `locationFilter`, `userFirstName`, etc.
- **Navigation:**
  - `navigation.navigate('Menu', { restaurant })`
  - `navigation.navigate('ProfileSetup', { canGoBack: true })`
  - `navigation.navigate('Camera')`
- **Developer Tip:**
  - Uses AsyncStorage for restaurant data
  - Allergen icons and menu cards match onboarding

### 8. **MenuScreen**
- **Purpose:** Displays the menu for a selected restaurant, including allergen highlights and details. Allows editing restaurant info.
- **Key Features:**
  - Menu list with allergen highlights
  - Edit restaurant name and info
  - Allergen modal for filtering
- **Props/State:**
  - `menu`, `selectedAllergens`, `editModalVisible`, etc.
- **Navigation:**
  - `navigation.goBack()`
- **Developer Tip:**
  - Uses `sharedEditRestaurant` for editing logic

### 9. **CameraScreen**
- **Purpose:** Lets users take a photo or pick an image from the gallery to scan a menu. After taking a photo, the image is sent to the backend for AI allergen detection.
- **Key Features:**
  - Camera and gallery picker
  - Review and confirm photo before upload
  - Sends photo to backend for menu scanning
- **Props/State:**
  - `reviewUri`, `scanMode`, `cameraError`, etc.
- **Navigation:**
  - `navigation.navigate('Home', { photoUri })`
- **Developer Tip:**
  - Uses `expo-camera` and `expo-image-picker`

### 10. **SplashScreen**
- **Purpose:** Initial splash/loading screen. Shows app branding and transitions to the appropriate initial route.
- **Key Features:**
  - Animated peanut and logo
  - Fades out and navigates to Home
- **Developer Tip:**
  - Uses `Animated` and `react-native-svg`

---

## Navigation Stack

The navigation is managed with React Navigation's stack navigator. The stack is defined in `App.tsx` as follows:

```tsx
<Stack.Navigator initialRouteName={initialRoute} ...>
  <Stack.Screen name="Splash" component={SplashScreen} />
  <Stack.Screen name="Login" component={LoginScreen} />
  <Stack.Screen name="OnboardingCarouselDemo" component={OnboardingCarouselDemo} />
  <Stack.Screen name="OnboardingScanDemo" component={OnboardingScanDemo} />
  <Stack.Screen name="OnboardingAddMenu" component={OnboardingAddMenu} />
  <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
  <Stack.Screen name="Camera" component={CameraScreen} />
  <Stack.Screen name="Welcome" component={Welcome} />
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Menu" component={MenuScreen} />
</Stack.Navigator>
```

---

## Navigation Flow

**Typical user journey:**

1. **LoginScreen**  
   ↓  
2. **OnboardingCarouselDemo**  
   ↓  
3. **OnboardingScanDemo**  
   ↓  
4. **OnboardingAddMenu**  
   ↓  
5. **ProfileSetup**  
   ↓  
6. **Welcome**  
   ↓  
7. **HomeScreen**  
   ↓  
8. **MenuScreen** (when a restaurant is selected)  
   ↓  
9. **CameraScreen** (when adding a new menu photo)

**Other navigation:**
- **Help button (HomeScreen, top right):** Always navigates to OnboardingCarouselDemo.
- **Profile button (HomeScreen, top left):** Navigates to ProfileSetup.
- **Camera button (HomeScreen, bottom):** Navigates to CameraScreen.

---

## Key Features

- **Onboarding:** Animated, multi-step onboarding with demo and permission requests.
- **AI Menu Scanning:** Take or upload a photo of a menu, send to backend for AI allergen detection.
- **Profile Management:** Select and save allergens, edit profile at any time.
- **Restaurant List:** Search, filter, and view restaurants and their menus.
- **Allergen Highlighting:** Menu items display allergen info with clear visual cues.
- **Help/Support:** Help button always available to re-show onboarding.

---

## Developer Notes

- **Navigation types** are defined in `mobile/src/screens/types/navigation.ts`.
- **AsyncStorage** is used for user profile and restaurant data.
- **Backend URL** is set in `mobile/config.ts` as `BASE_URL`.
- **All screens use a white background** for a clean, consistent look.
- **Debug tools** (like clear AsyncStorage) can be added as needed in `App.tsx`.

---

## Data Models

### UserProfile
Defined in `src/context/UserProfileContext.tsx`:
```ts
interface UserProfile {
  firstName: string;
  lastName: string;
  allergens: string[]; // e.g. ['peanuts', 'dairy']
}
```
- **Stored in AsyncStorage** under the key `userProfile` as a JSON string.

### Restaurant
Defined in `src/restaurantData.ts` (or inline in storage/screens):
```ts
interface Restaurant {
  id: string;
  restaurantName: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  menuItems: MenuItem[];
  source: string; // e.g. 'camera', 'manual', etc.
  apimatch?: string; // e.g. 'google', 'none'
  googlePlace?: any; // Google Place object if matched
  brandLogo?: string; // URL to logo image
  updatedAt: number; // timestamp
  createdAt: number; // timestamp
  hidden?: boolean;
  verifiedName?: string;
  verifiedLocation?: { lat: number; lng: number };
}
```
- **Stored in AsyncStorage** under the key `restaurants` as a JSON array.

### MenuItem
```ts
interface MenuItem {
  id: string;
  name: string;
  allergens: string[]; // e.g. ['peanuts', 'dairy']
  certainty?: number; // AI confidence score (0-1 or 0-100)
}
```

---

## AsyncStorage Keys & Data Shape

- `userProfile`: JSON string of `UserProfile`
- `restaurants`: JSON array of `Restaurant`
- (Other keys may be added for future features, e.g. app settings)

---

## Backend API Contract

### Menu Scanning Endpoint
- **Endpoint:** `POST /api/upload-menu`
- **Purpose:** Accepts a menu photo and returns AI-detected menu items and allergens.
- **Request:**
  - Content-Type: `multipart/form-data`
  - Fields:
    - `file`: The image file (menu photo)
    - `restaurantName`: (optional) Name of the restaurant
    - `lat`, `lng`: (optional) Location coordinates
- **Example Request (using fetch):**
  ```js
  const formData = new FormData();
  formData.append('file', { uri, name: 'menu.jpg', type: 'image/jpeg' });
  formData.append('restaurantName', 'Chipotle');
  formData.append('lat', 37.7749);
  formData.append('lng', -122.4194);
  fetch(`${BASE_URL}/api/upload-menu`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  ```
- **Response:**
  - `200 OK` with JSON body:
    ```json
    {
      "restaurantName": "Chipotle",
      "menuItems": [
        { "id": "1", "name": "Chicken Burrito", "allergens": ["dairy"] },
        { "id": "2", "name": "Veggie Bowl", "allergens": [] }
      ],
      "apimatch": "google",
      "googlePlace": { ... },
      "brandLogo": "https://.../logo.png"
    }
    ```
  - On error: `400` or `500` with error message

### Maps/Google Place Endpoint
- **Endpoint:** `GET /api/maps?restaurantName=...&lat=...&lng=...`
- **Purpose:** Verifies restaurant name/location and returns Google Place data if matched.
- **Response:**
  - `apimatch`: 'google' or 'none'
  - `googlePlace`: Google Place object (if matched)

---

## How AI Menu Scanning Works

1. **User takes or selects a menu photo** in CameraScreen.
2. **Photo is uploaded** to `/api/upload-menu` with optional restaurant name/location.
3. **Backend processes the image** using OCR and AI to extract menu items and detect allergens.
4. **Response includes:**
   - Restaurant name (possibly Google-verified)
   - Menu items with detected allergens
   - Brand logo (if available)
   - Google Place data (if matched)
5. **App saves the restaurant/menu** to AsyncStorage and updates the UI.

---

## Adding New Allergens or Screens

- **To add a new allergen:**
  - Add to the `ALLERGENS` array in all relevant screens (ProfileSetup, OnboardingCarouselDemo, MenuScreen, etc.)
  - Add a matching SVG icon in `assets/icons/`
  - Update any logic that filters or displays allergens
- **To add a new screen:**
  - Create a new file in `src/screens/`
  - Add to the stack navigator in `App.tsx`
  - Update navigation types in `src/screens/types/navigation.ts`

---

## Running, Debugging, and Testing

- **Start the app:**
  - `cd mobile && npm install && npm start`
- **Run on iOS/Android:**
  - `npm run ios` or `npm run android`
- **Debug:**
  - Use Expo Go or a simulator
  - Use React Native Debugger for Redux/AsyncStorage
  - Use console logs and breakpoints in VSCode
- **Test backend connectivity:**
  - Ensure `BASE_URL` in `config.ts` points to your backend
  - Test `/api/upload-menu` with a real image

---

**If you need even more detail (e.g. per-component props, animation breakdowns, or backend code), just say "keep going"!** 