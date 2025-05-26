import { checkGoogleMapsRestaurant } from "./mapsService";
import { fetchLogoUrl } from './logoService';

// Generic interface for menu data from any source
interface MenuData {
  restaurantName: string;
  location: { lat: number; lng: number };
  menuItems: Array<{ name: string; allergens: string[]; certainty: number }>;
  source: 'camera' | 'manual';
}

/**
 * Gets menu data for a restaurant
 */
export async function getMenuContext() {
  // MongoDB removed: always return null
  return null;
}

/**
 * Stores restaurant information with menu data
 */
export async function storeRestaurantWithMenu(
  menuData: MenuData
): Promise<boolean> {
  try {
    // Check Google Maps for restaurant match
    const googleMatch = await checkGoogleMapsRestaurant(menuData.restaurantName, menuData.location);
    // Fetch logo if Google match is found
    if (googleMatch.found && googleMatch.googlePlace && googleMatch.googlePlace.name) {
      await fetchLogoUrl(googleMatch.googlePlace.name);
    }
    // MongoDB removed: just log and return true
    console.log('Simulated storing restaurant data:', menuData.restaurantName);
    return true;
  } catch (error) {
    console.error('Error storing restaurant data:', error);
    return false;
  }
}

/**
 * Retrieves restaurant information from the database
 * @returns Restaurant information or null if not found
 */
export async function getRestaurantInfo() {
  // MongoDB removed: always return null
  return null;
}

// Google-only match for restaurant name/location
export async function getGoogleOnlyMatch(
  restaurantName: string,
  location: { lat: number; lng: number }
) {
  // Only use Google Places API for matching
  const googleMatch = await checkGoogleMapsRestaurant(restaurantName, location);
  if (googleMatch.found && googleMatch.googlePlace) {
    return {
      restaurantName: googleMatch.googlePlace.name,
      location: googleMatch.googlePlace.location,
      apimatch: 'google',
      googlePlace: googleMatch.googlePlace,
    };
  }
  // No match found
  return {
    restaurantName,
    location,
    apimatch: 'none',
    googlePlace: null,
  };
} 