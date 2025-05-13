import { BASE_URL } from '../../config';

export async function fetchGooglePlace(name: string, location: { lat: number; lng: number }) {
  try {
    const params = new URLSearchParams({
      restaurantName: name,
      lat: String(location.lat),
      lng: String(location.lng),
    });
    const res = await fetch(`${BASE_URL}/api/maps?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.apimatch === 'google' && data.googlePlace && data.googlePlace.name && data.googlePlace.location) {
        return data.googlePlace;
      }
    }
  } catch (e) {}
  return null;
} 