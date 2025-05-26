import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../restaurantData';
import { fetchGooglePlace } from '../api/googleApi';
import { fetchLogoDevUrl } from '../api/logoDevApi';

const RESTAURANTS_KEY = 'restaurants';

export async function saveRestaurants(restaurants: Restaurant[]) {
  await AsyncStorage.setItem(RESTAURANTS_KEY, JSON.stringify(restaurants));
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const data = await AsyncStorage.getItem(RESTAURANTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addRestaurant(newRestaurant: Restaurant) {
  const restaurants = await getRestaurants();
  restaurants.push(newRestaurant);
  await saveRestaurants(restaurants);
}

export async function deleteRestaurant(id: string) {
  const restaurants = await getRestaurants();
  const updated = restaurants.filter(r => r.id !== id);
  await saveRestaurants(updated);
}

// Edit restaurant name, reload logo and location via API, and save
export async function editRestaurant(
  id: string,
  newName: string,
  verifiedName?: string,
  verifiedLocation?: { lat: number; lng: number },
  apimatch?: string,
  googlePlace?: any,
  brandLogo?: string,
  locationOverride?: { lat: number; lng: number },
) {
  const restaurants = await getRestaurants();
  const idx = restaurants.findIndex(r => r.id === id);
  if (idx === -1) return;
  const restaurant = restaurants[idx];
  // Use passed-in values if provided, otherwise fallback to old logic
  let finalVerifiedName = verifiedName;
  let finalApimatch = apimatch;
  let finalGooglePlace = googlePlace;
  let finalBrandLogo: string = brandLogo || '';
  let finalLocation = restaurant.location;
  // Only require Google match fields, not brandLogo
  if (!finalVerifiedName || !finalApimatch || !finalGooglePlace || !locationOverride) {
    // Normalize name for Google API
    const normalizedNewName = newName.trim();
    // Fallback to Google API if not all provided
    const googlePlaceResult = await fetchGooglePlace(normalizedNewName, locationOverride || {
      lat: restaurant.location.coordinates[1],
      lng: restaurant.location.coordinates[0],
    });
    if (googlePlaceResult && googlePlaceResult.name) {
      finalVerifiedName = googlePlaceResult.name;
      finalApimatch = 'google';
      finalGooglePlace = googlePlaceResult;
      if (finalApimatch === 'google') {
        finalBrandLogo = await fetchLogoDevUrl(googlePlaceResult?.name || newName) || '';
      } else {
        finalBrandLogo = '';
      }
      // Always update location and verifiedLocation to Google-verified location
      if (googlePlaceResult.location) {
        finalLocation = {
          type: 'Point',
          coordinates: [googlePlaceResult.location.lng, googlePlaceResult.location.lat],
        };
        // Also update verifiedLocation field on the restaurant object
        restaurants[idx].verifiedLocation = {
          lat: googlePlaceResult.location.lat,
          lng: googlePlaceResult.location.lng,
        };
      }
    } else {
      finalApimatch = 'none';
      // If saving as custom, set location to user's current location (locationOverride) if provided
      if (locationOverride) {
        finalLocation = {
          type: 'Point',
          coordinates: [locationOverride.lng, locationOverride.lat],
        };
        // Optionally update verifiedLocation as well
        restaurants[idx].verifiedLocation = {
          lat: locationOverride.lat,
          lng: locationOverride.lng,
        };
      }
      console.warn('[Edit Debug] WARNING: Google API returned no match during edit fallback logic. Saving as custom.');
    }
  } else {
    finalLocation = {
      type: 'Point',
      coordinates: [verifiedLocation!.lng, verifiedLocation!.lat],
    };
  }
  restaurants[idx] = {
    ...restaurant,
    restaurantName: newName,
    verifiedName: finalVerifiedName,
    apimatch: finalApimatch,
    googlePlace: finalGooglePlace,
    brandLogo: finalBrandLogo,
    location: finalLocation,
  };
  await saveRestaurants(restaurants);
  // Log when a restaurant goes from google match to custom
  if (restaurant.apimatch === 'google' && finalApimatch !== 'google') {
    console.log('[Debug] Restaurant changed from Google match to custom:', {
      id,
      oldName: restaurant.verifiedName || restaurant.restaurantName,
      newName,
      oldApimatch: restaurant.apimatch,
      newApimatch: finalApimatch,
    });
  }
  // Log when a restaurant is verified by Google by name and location
  if (finalApimatch === 'google' && finalGooglePlace) {
    console.log('[Debug] Restaurant is Google verified by name and location:', {
      id,
      name: finalVerifiedName,
      location: finalLocation,
      googlePlace: finalGooglePlace,
    });
  }
} 