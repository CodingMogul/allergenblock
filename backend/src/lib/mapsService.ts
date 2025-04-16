// lib/mapsService.ts

import { connectToDatabase } from "./mongodb";
import { calculateStringSimilarity, calculateDistance } from "@/utils/stringSimilarity";
import { RESTAURANT_SIMILARITY_THRESHOLD, RESTAURANT_DISTANCE_THRESHOLD } from "@/utils/constants";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

/**
 * Gets nearby restaurants from Google Maps and matches them with our database
 */
export async function getNearbyRestaurants(
  location: { lat: number; lng: number }
): Promise<Array<{ name: string; location: { lat: number; lng: number }; menuData?: any }>> {
  try {
    // 1. First get nearby restaurants from Google Maps
    const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: "500", // Search in 500m radius to find potential matches
      type: "restaurant",
      key: GOOGLE_MAPS_API_KEY,
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log("🔍 Getting nearby restaurants from Google Maps:", location);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results.length) {
      return [];
    }

    // 2. Get our database restaurants
    const db = await connectToDatabase();
    const dbRestaurants = await db.collection("restaurants").find({}).toArray();

    // 3. Match Google Maps results with our database
    return data.results.map((place: any) => {
      const googleRestaurant = {
        name: place.name,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        }
      };

      // Find matching restaurant in our database
      const matchingDbRestaurant = dbRestaurants.find(dbRest => {
        const nameSimilarity = calculateStringSimilarity(dbRest.restaurantName, place.name);
        const distance = calculateDistance(
          { lat: dbRest.location.coordinates[1], lng: dbRest.location.coordinates[0] },
          googleRestaurant.location
        );
        
        return nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD && distance <= RESTAURANT_DISTANCE_THRESHOLD;
      });

      return {
        ...googleRestaurant,
        menuData: matchingDbRestaurant || null
      };
    });
  } catch (error) {
    console.error("Error getting nearby restaurants:", error);
    return [];
  }
}

interface GoogleMapsMatch {
  found: boolean;
  googlePlace?: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
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
      const bestMatch = data.results[0];
      const nameSimilarity = calculateStringSimilarity(bestMatch.name, restaurantName);
      
      // Only consider it a match if name similarity is >= 80%
      const isMatch = nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD;
      
      return {
        found: isMatch,
        googlePlace: isMatch ? {
          name: bestMatch.name,
          location: {
            lat: bestMatch.geometry.location.lat,
            lng: bestMatch.geometry.location.lng,
          }
        } : undefined
      };
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
