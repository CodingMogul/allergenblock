import { NextRequest, NextResponse } from "next/server";
import { processCameraImage } from "../../../lib/cameraUploadData";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json(); // Only use 'image' since others are unused

    // Helper to check if all top-level fields are null
    function isAllNull(obj: unknown) {
      if (!obj || typeof obj !== "object") return false;
      return Object.values(obj).every((v) => v === null);
    }

    // Pass the base64 string to Gemini
    const result = await processCameraImage(image);

    // If Gemini timed out or failed, and all fields are null, return special response
    if (isAllNull(result)) {
      return NextResponse.json({ success: false, reason: "no_menu" });
    }

    // No MongoDB storage, just return Gemini result
    return NextResponse.json({
      success: true,
      gemini: !!result.menuItems,
      data: result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
