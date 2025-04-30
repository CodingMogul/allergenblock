import { connectToDatabase } from "./mongodb";
import { checkGoogleMapsRestaurant } from "./mapsService";
import { calculateStringSimilarity, calculateDistance } from "../utils/stringSimilarity";
import { findBestMatchingMenu } from "../utils/menuMatcher";
import { RESTAURANT_SIMILARITY_THRESHOLD, RESTAURANT_DISTANCE_THRESHOLD } from "@/utils/constants";
import { ObjectId } from "mongodb";

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
export async function getMenuContext(
  restaurantName: string,
  location: { lat: number; lng: number },
  restaurantId?: string
) {
  const db = await connectToDatabase();
  
  // If restaurantId is provided, try to find the restaurant directly by ID
  if (restaurantId) {
    const restaurant = await db.db.collection("restaurants").findOne({
      _id: new ObjectId(restaurantId)
    });
    if (restaurant) return restaurant;
  }
  
  // First try exact match
  const exactMatch = await db.db.collection("restaurants").findOne({
    restaurantName,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [location.lng, location.lat] },
        $maxDistance: RESTAURANT_DISTANCE_THRESHOLD,
      },
    },
  });

  if (exactMatch) return exactMatch;

  // If no exact match, try similar names within distance
  const allRestaurants = await db.db.collection("restaurants").find({}).toArray();
  
  return allRestaurants.find(restaurant => {
    const nameSimilarity = calculateStringSimilarity(restaurant.restaurantName, restaurantName);
    const distance = calculateDistance(
      { lat: restaurant.location.coordinates[1], lng: restaurant.location.coordinates[0] },
      location
    );
    
    return nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD && distance <= RESTAURANT_DISTANCE_THRESHOLD;
  });
}

/**
 * Stores restaurant information with menu data
 */
export async function storeRestaurantWithMenu(
  menuData: MenuData
): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    
    // Check Google Maps for restaurant match
    const googleMatch = await checkGoogleMapsRestaurant(menuData.restaurantName, menuData.location);
    
    // Find restaurants with similar names
    const existingRestaurants = await db.db.collection("restaurants").find({}).toArray();
    
    // Check for similar restaurants within distance threshold
    const similarRestaurant = existingRestaurants.find(restaurant => {
      const nameSimilarity = calculateStringSimilarity(restaurant.restaurantName, menuData.restaurantName);
      const distance = calculateDistance(
        { lat: restaurant.location.coordinates[1], lng: restaurant.location.coordinates[0] },
        menuData.location
      );
      
      return nameSimilarity >= RESTAURANT_SIMILARITY_THRESHOLD && distance <= RESTAURANT_DISTANCE_THRESHOLD;
    });

    const restaurantData = {
      restaurantName: menuData.restaurantName,
      location: {
        type: "Point",
        coordinates: [menuData.location.lng, menuData.location.lat]
      },
      menuItems: menuData.menuItems.map(item => ({
        name: item.name,
        allergens: item.allergens,
        certainty: item.certainty
      })),
      source: menuData.source,
      apimatch: googleMatch.found ? 'google' : 'none',
      ...(googleMatch.googlePlace && { googlePlace: googleMatch.googlePlace }),
      updatedAt: new Date()
    };

    if (similarRestaurant) {
      // Update existing restaurant with new menu data
      console.log('Similar restaurant found, updating menu data:', menuData.restaurantName);
      await db.db.collection("restaurants").updateOne(
        { _id: similarRestaurant._id },
        { $set: restaurantData }
      );
    } else {
      // Create new restaurant document with menu data
      console.log('Creating new restaurant document:', menuData.restaurantName);
      await db.db.collection("restaurants").insertOne({
        ...restaurantData,
        createdAt: new Date(),
        hidden: false
      });
    }
    
    console.log('Successfully stored restaurant data:', menuData.restaurantName);
    return true;
  } catch (error) {
    console.error('Error storing restaurant data:', error);
    return false;
  }
}

/**
 * Retrieves restaurant information from the database
 * @param restaurantName - Name of the restaurant
 * @param location - Location coordinates
 * @returns Restaurant information or null if not found
 */
export async function getRestaurantInfo(
  restaurantName: string,
  location: {lat: number, lng: number}
) {
  try {
    const db = await connectToDatabase();
    return db.db.collection("restaurants").findOne({
      restaurantName,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [location.lng, location.lat] },
          $maxDistance: 100,
        },
      },
    });
  } catch (error) {
    console.error('Error retrieving restaurant info:', error);
    return null;
  }
} 