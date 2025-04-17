import { NextResponse } from "next/server";
import { processCameraImage } from "@/lib/cameraUploadData";

import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file) {
    return NextResponse.json({ error: "Missing ?file parameter" }, { status: 400 });
  }

  const imagePath = path.join("menu-testing", "test-menus", file);

  try {
    const result = await processCameraImage({ path: imagePath });

    return NextResponse.json({
      success: true,
      filename: file,
      ...result,
    });
  } catch (error) {
    console.error("❌ Error processing file:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
