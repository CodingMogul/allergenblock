import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/lib/mongodb"; 
import { calculateStringSimilarity } from "@/utils/stringSimilarity";
import { findBestMatchingMenu } from "@/utils/menuMatcher";
import { checkGoogleMapsRestaurant, getNearbyRestaurants } from "@/lib/mapsService";
import { getMenuContext, storeRestaurantWithMenu, getGoogleOnlyMatch } from "@/lib/restaurantService";
import { requestCameraCapture, processImageWithGemini, processCameraImage } from "@/lib/cameraUploadData";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

// Initialize Gemini AI model
if(!process.env.GEMINI_API_KEY){
    throw new Error("GEMINI_API_KEY not found in environment variables")
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"});

/**
 * GET endpoint to retrieve menu data for a specific restaurant and location
 * This endpoint filters menus based on:
 * - Restaurant name (exact match)
 * - Location (within 100 meters radius)
 * 
 * @param {NextRequest} req - The incoming request containing query parameters
 * @returns {Promise<NextResponse>} JSON response containing filtered menu data
 * 
 * Query Parameters:
 * - restaurantName: string (required)
 * - lat: number (required)
 * - lng: number (required)
 * 
 * Example request: /api/maps?restaurantName=Pizza%20Palace&lat=37.7749&lng=-122.4194
 * Example response:
 * {
 *   restaurantName: "Pizza Palace",
 *   location: { lat: 37.7749, lng: -122.4194 },
 *   menuItems: [
 *     { name: "Margherita Pizza", allergens: ["dairy", "gluten"] }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const restaurantName = searchParams.get('restaurantName');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const restaurantId = searchParams.get('restaurantId');

    // Validate required parameters
    if ((!restaurantName || !lat || !lng) && !restaurantId) {
      return NextResponse.json(
        { error: 'Either restaurantId or restaurant name with location are required' },
        { status: 400 }
      );
    }

    // Only use Google API for matching
    const match = await getGoogleOnlyMatch(restaurantName, { lat: parseFloat(lat || '0'), lng: parseFloat(lng || '0') });

    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to find nearby restaurants with menu data
 * 
 * @param {Request} request - The incoming request containing location and source
 * @returns {Promise<NextResponse>} JSON response containing nearby restaurants with menu data
 */
export async function POST(request: Request) {
  try {
    const { imageData, restaurantName, location } = await request.json();

    // Process the image to extract menu data
    const cameraData = await processCameraImage(imageData);
    
    // Store the restaurant and menu data
    const success = await storeRestaurantWithMenu({
      restaurantName,
      location,
      menuItems: cameraData.menuItems.map(item => ({
        ...item,
        certainty: 1.0
      })),
      source: 'camera'
    });

    if (!success) {
      return NextResponse.json({ error: "Failed to store restaurant data" }, { status: 500 });
    }

    // Get the stored menu context
    const menuContext = await getMenuContext(restaurantName, location);
    
    if (!menuContext) {
      return NextResponse.json({ error: "Failed to retrieve menu context" }, { status: 500 });
    }

    // Find the best matching menu
    const bestMatch = findBestMatchingMenu(cameraData.menuItems, menuContext.menuItems);

    return NextResponse.json({ success: true, bestMatch });
  } catch (error) {
    console.error("Error processing camera image:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}

/**
 * POST endpoint to process and store menu data
 * Can handle both camera-processed images and manual menu data
 * 
 * @param {Request} request - The incoming request containing menu data
 * @returns {Promise<NextResponse>} JSON response containing processed menu data
 */
export async function POST_ALLERGEN(request: Request) {
  try {
    const { image, restaurantName, latitude, longitude, source } = await request.json();

    if (!image || !restaurantName || latitude == undefined || longitude == undefined || !source) {
      return NextResponse.json(
        { error: "Missing required fields (image, restaurantName, latitude, longitude, source)" },
        { status: 400 }
      );
    }

    // Extract base64 data from image
    const base64Image = image.includes(',') ? image.split(',')[1] : image;
    
    // Process image with Gemini AI
    const menuItems = await processImageWithGemini(base64Image);

    // Create menu data object
    const menuData = {
      success: true,
      message: 'Menu captured successfully',
      restaurantName: restaurantName,
      location: { lat: latitude, lng: longitude },
      menuItems: menuItems,
      source: source
    };

    // Store restaurant data
    const stored = await storeRestaurantWithMenu(menuData);

    return NextResponse.json({
      ...menuData,
      stored: stored
    });
  } catch (error) {
    console.log("[POST/allergen] Request failed", error);
    return NextResponse.json(
      { message: "error" },
      { status: 500 }
    );
  }
}