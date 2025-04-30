import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const restaurants = await db.collection('restaurants')
      .find({})
      .project({ _id: 1, restaurantName: 1, location: 1 })
      .toArray();

    const formattedRestaurants = restaurants.map(restaurant => ({
      id: restaurant._id.toString(),
      name: restaurant.restaurantName,
      latitude: restaurant.location?.coordinates?.[1],
      longitude: restaurant.location?.coordinates?.[0],
    }));

    return NextResponse.json(formattedRestaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, hidden } = await request.json();
    if (!id || typeof hidden === 'undefined') {
      return NextResponse.json({ error: 'Missing id or hidden parameter' }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(id) },
      { $set: { hidden } }
    );
    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Restaurant not found or not updated' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating restaurant hidden field:', error);
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
  }
} 