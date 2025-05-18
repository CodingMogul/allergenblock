import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const restaurant = await db.collection("restaurants").findOne({
      _id: new ObjectId(id),
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const formattedRestaurant = {
      id: restaurant._id.toString(),
      name: restaurant.restaurantName,
      menuItems: restaurant.menuItems.map((item: any) => ({
        name: item.name,
        allergens: item.allergens || [],
        certainty: item.certainty || 1.0,
      })),
    };

    return NextResponse.json(formattedRestaurant);
  } catch (error) {
    console.error("Error fetching menu details:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu details" },
      { status: 500 }
    );
  }
}
