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
) {
  const restaurants = await getRestaurants();
  const idx = restaurants.findIndex(r => r.id === id);
  if (idx === -1) return;
  const restaurant = restaurants[idx];
  // Call Google API for new place info
  const googlePlace = await fetchGooglePlace(newName, {
    lat: restaurant.location.coordinates[1],
    lng: restaurant.location.coordinates[0],
  });
  // Call logo.dev API for new logo
  const brandLogo = await fetchLogoDevUrl(newName);
  // Update restaurant
  restaurants[idx] = {
    ...restaurant,
    restaurantName: newName,
    googlePlace,
    brandLogo,
    // Optionally update location if googlePlace returns new location
    location: googlePlace && googlePlace.location
      ? {
          type: 'Point',
          coordinates: [googlePlace.location.lng, googlePlace.location.lat],
        }
      : restaurant.location,
  };
  await saveRestaurants(restaurants);
} 