// lib/mapsService.ts

import { calculateStringSimilarity, calculateDistance } from "@/utils/stringSimilarity";
import { RESTAURANT_SIMILARITY_THRESHOLD, RESTAURANT_DISTANCE_THRESHOLD } from "@/utils/constants";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

interface GoogleMapsMatch {
  found: boolean;
  googlePlace?: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    icon?: string;
  };
}

/**
 * Checks if a restaurant exists in Google Maps and returns match information
 */
export async function checkGoogleMapsRestaurant(
  restaurantName: string,
  location: { lat: number; lng: number }
): Promise<GoogleMapsMatch> {
  try {
    // 1. First check Google Maps
    const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: RESTAURANT_DISTANCE_THRESHOLD.toString(),
      type: "restaurant",
      keyword: restaurantName,
      key: GOOGLE_MAPS_API_KEY,
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      // Check all results for best match
      let bestMatch = null;
      let bestSimilarity = 0;
      let bestDist = null;
      for (const result of data.results) {
        const nameSimilarity = calculateStringSimilarity(result.name, restaurantName);
        const dist = calculateDistance(
          { lat: result.geometry.location.lat, lng: result.geometry.location.lng },
          location
        );
        if (
          nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD &&
          dist <= RESTAURANT_DISTANCE_THRESHOLD &&
          (
            nameSimilarity > bestSimilarity ||
            (nameSimilarity === bestSimilarity && (bestDist === null || dist < bestDist))
          )
        ) {
          bestMatch = result;
          bestSimilarity = nameSimilarity;
          bestDist = dist;
        }
      }
      if (bestMatch) {
        return {
          found: true,
          googlePlace: {
            name: bestMatch.name,
            location: {
              lat: bestMatch.geometry.location.lat,
              lng: bestMatch.geometry.location.lng,
            },
            ...(bestMatch.icon ? { icon: bestMatch.icon } : {})
          }
        };
      }
    }

    return {
      found: false
    };
  } catch (error) {
    console.error('Error checking restaurant existence:', error);
    return {
      found: false
    };
  }
}
