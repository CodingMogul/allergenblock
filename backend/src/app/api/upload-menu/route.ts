import { NextRequest, NextResponse } from 'next/server';
import { processCameraImage } from '../../../lib/cameraUploadData';
import { storeRestaurantWithMenu } from '../../../lib/restaurantService';

export async function POST(req: NextRequest) {
  try {
    const { image, restaurantName, location } = await req.json(); // image is the base64 string

    // Helper to check if all top-level fields are null
    function isAllNull(obj: any) {
      if (!obj || typeof obj !== 'object') return false;
      return Object.values(obj).every(v => v === null);
    }

    // Pass the base64 string to Gemini
    const result = await processCameraImage(image);

    // If Gemini timed out or failed, and all fields are null, return special response
    if (isAllNull(result)) {
      return NextResponse.json({ success: false, reason: 'no_menu' });
    }

    // Store in MongoDB if restaurantName and location are provided
    let mongoSuccess = false;
    if (restaurantName && location && result.menuItems && result.menuItems.length > 0) {
      const menuData = {
        restaurantName,
        location,
        menuItems: result.menuItems.map((item: any) => ({
          name: item.name,
          allergens: item.allergens,
          certainty: typeof item.certainty === 'number' ? item.certainty : 1
        })),
        source: 'camera' as const
      };
      mongoSuccess = await storeRestaurantWithMenu(menuData);
    }

    return NextResponse.json({ success: true, gemini: !!result.menuItems, mongo: mongoSuccess, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 