import { NextRequest, NextResponse } from "next/server";
import { calculateStringSimilarity } from "@/utils/stringSimilarity";
import { findBestMatchingMenu } from "@/utils/menuMatcher";
import {
  checkGoogleMapsRestaurant,
  getNearbyRestaurants,
} from "@/lib/mapsService";
import {
  getGoogleOnlyMatch,
} from "@/lib/restaurantService";
import {
  requestCameraCapture,
  processImageWithGemini,
  processCameraImage,
} from "@/lib/cameraUploadData";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

// Initialize Gemini AI model
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const restaurantName = searchParams.get("restaurantName");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const restaurantId = searchParams.get("restaurantId"); // Validate required parameters

    if ((!restaurantName || !lat || !lng) && !restaurantId) {
      return NextResponse.json(
        {
          error:
            "Either restaurantId or restaurant name with location are required",
        },
        { status: 400 }
      );
    }

    // If we have a restaurantId, we should handle that case differently
    if (restaurantId) {
      // TODO: Implement restaurantId lookup
      return NextResponse.json(
        { error: "Restaurant ID lookup not implemented yet" },
        { status: 501 }
      );
    }

    // At this point, we know restaurantName, lat, and lng are not null
    const match = await getGoogleOnlyMatch(restaurantName!, {
      lat: parseFloat(lat || "0"),
      lng: parseFloat(lng || "0"),
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
