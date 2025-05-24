// lib/mapsService.ts

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
    // const { db } = await connectToDatabase();
    // const dbRestaurants = await db.collection("restaurants").find({}).toArray();

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
      // const matchingDbRestaurant = dbRestaurants.find(dbRest => {
      //   const nameSimilarity = calculateStringSimilarity(dbRest.restaurantName, place.name);
      //   const distance = calculateDistance(
      //     { lat: dbRest.location.coordinates[1], lng: dbRest.location.coordinates[0] },
      //     googleRestaurant.location
      //   );
      //   
      //   return nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD && distance <= RESTAURANT_DISTANCE_THRESHOLD;
      // });

      return {
        ...googleRestaurant,
        menuData: null // matchingDbRestaurant || null
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
    // Remove or comment out all GoogleMatch logs except errors
    // console.log(`[GoogleMatch] Querying for: '${restaurantName}' at`, location);
    // console.log(`[GoogleMatch] Google API URL: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    // Remove or comment out the full API response log
    // console.log('[GoogleMatch] Google API raw response:', JSON.stringify(data, null, 2));
    if (data.results && data.results.length > 0) {
      // Remove or comment out all GoogleMatch logs except errors
      // console.log(`[GoogleMatch] Found ${data.results.length} results. Names/locations/distances:`);
      // data.results.forEach((result: any, idx: number) => {
      //   const dist = calculateDistance(
      //     { lat: result.geometry.location.lat, lng: result.geometry.location.lng },
      //     location
      //   );
      //   console.log(`  [${idx}] Name: '${result.name}', Location: (${result.geometry.location.lat}, ${result.geometry.location.lng}), Distance: ${dist}m, Types: ${JSON.stringify(result.types)}`);
      // });
    }

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
        // Remove or comment out all GoogleMatch logs except errors
        // console.log(`[GoogleMatch] Checking: '${result.name}', Distance: ${dist}, Threshold: ${RESTAURANT_DISTANCE_THRESHOLD}`);
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
        const distValue = bestDist ?? 0;
        const willOverwrite = bestMatch.name !== restaurantName || distValue > 0;
        // Remove or comment out all GoogleMatch logs except errors
        // console.log(`[GoogleMatch] ✅ MATCH: '${bestMatch.name}' (similarity: ${bestSimilarity}, distance: ${distValue}m). Overwrite: ${willOverwrite ? 'YES' : 'NO'}`);
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
      } else {
        // Remove or comment out all GoogleMatch logs except errors
        // console.log('[GoogleMatch] ❌ No result passed similarity and distance thresholds.');
      }
    } else {
      // Remove or comment out all GoogleMatch logs except errors
      // console.log('[GoogleMatch] ❌ No results from Google API.');
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
