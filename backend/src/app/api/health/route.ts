import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Using nodejs since you're using MongoDB

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
