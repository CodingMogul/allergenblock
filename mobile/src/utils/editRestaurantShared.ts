import { fetchGooglePlace } from '../api/googleApi';
import { fetchLogoDevUrl } from '../api/logoDevApi';
import { getRestaurants } from '../storage/restaurantStorage';
import type { Restaurant } from '../restaurantData';

// Shared edit logic for restaurant name (matches HomeScreen/MenuScreen)
export async function sharedEditRestaurant({
  id,
  oldName,
  newName,
  setEditModalVisible,
  setEditNameInput,
  setEditSaving,
  fetchRestaurants,
}: {
  id: string;
  oldName: string;
  newName: string;
  setEditModalVisible: (v: boolean) => void;
  setEditNameInput: (v: string) => void;
  setEditSaving: (v: boolean) => void;
  fetchRestaurants: () => Promise<any>;
}) {
  if (!newName.trim()) return;
  setEditSaving(true);
  let location = { lat: 0, lng: 0 };
  try {
    const { status } = await (await import('expo-location')).requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await (await import('expo-location')).getCurrentPositionAsync({});
      location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
  } catch {}
  // Google API match for name/location
  const googleResult = await fetchGooglePlace(newName, location);
  let verifiedName = newName;
  let verifiedLocation = location;
  let googlePlace = undefined;
  let apimatch = 'none';
  if (googleResult && googleResult.apimatch === 'google' && googleResult.googlePlace) {
    verifiedName = googleResult.googlePlace.name;
    verifiedLocation = googleResult.googlePlace.location;
    googlePlace = googleResult.googlePlace;
    apimatch = 'google';
  }
  // logo.dev for logo (always use verifiedName)
  const brandLogo = await fetchLogoDevUrl(verifiedName, verifiedName);
  try {
    const { editRestaurant } = await import('../storage/restaurantStorage');
    await editRestaurant(
      id,
      newName,
      verifiedName,
      verifiedLocation,
      apimatch,
      googlePlace,
      brandLogo || '',
      verifiedLocation
    );
    setEditModalVisible(false);
    setEditNameInput('');
    await fetchRestaurants();
  } catch (e: any) {
    alert(e.message || 'Failed to update restaurant name.');
  } finally {
    setEditSaving(false);
  }
} 