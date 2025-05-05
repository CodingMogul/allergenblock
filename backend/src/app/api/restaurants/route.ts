import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { checkGoogleMapsRestaurant } from '@/lib/mapsService';
import { fetchLogoUrl } from '@/lib/logoService';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const restaurants = await db.collection('restaurants')
      .find({})
      .project({ _id: 1, restaurantName: 1, location: 1, hidden: 1, apimatch: 1, brandLogo: 1, googlePlace: 1 })
      .toArray();

    const formattedRestaurants = restaurants.map(restaurant => ({
      id: restaurant._id.toString(),
      name: restaurant.restaurantName,
      displayName: restaurant.googlePlace?.name || restaurant.restaurantName,
      latitude: restaurant.location?.coordinates?.[1],
      longitude: restaurant.location?.coordinates?.[0],
      hidden: restaurant.hidden || false,
      apimatch: restaurant.apimatch || 'none',
      brandLogo: restaurant.brandLogo ?? null,
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
    const { id, hidden, newName, newLocation } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const updateFields: any = {};
    if (typeof hidden !== 'undefined') updateFields.hidden = hidden;
    if (typeof newName === 'string' && newName.trim()) {
      const nameToCheck = newName.trim();
      const locToCheck = newLocation && typeof newLocation.lat === 'number' && typeof newLocation.lng === 'number'
        ? newLocation
        : undefined;
      let googleMatch = null;
      if (locToCheck) {
        googleMatch = await checkGoogleMapsRestaurant(nameToCheck, locToCheck);
      }
      if (googleMatch && googleMatch.found && googleMatch.googlePlace && googleMatch.googlePlace.name) {
        updateFields.restaurantName = googleMatch.googlePlace.name;
        updateFields.location = {
          type: 'Point',
          coordinates: [googleMatch.googlePlace.location.lng, googleMatch.googlePlace.location.lat],
        };
        updateFields.googlePlace = googleMatch.googlePlace;
        updateFields.apimatch = 'google';
        const brandLogo = await fetchLogoUrl(googleMatch.googlePlace.name);
        if (brandLogo) updateFields.brandLogo = brandLogo;
      } else {
        updateFields.restaurantName = nameToCheck;
        if (locToCheck) {
          updateFields.location = {
            type: 'Point',
            coordinates: [locToCheck.lng, locToCheck.lat],
          };
        }
        updateFields.googlePlace = undefined;
        updateFields.apimatch = 'none';
        updateFields.brandLogo = undefined;
      }
    } else if (newLocation && typeof newLocation.lat === 'number' && typeof newLocation.lng === 'number') {
      updateFields.location = {
        type: 'Point',
        coordinates: [newLocation.lng, newLocation.lat],
      };
    }
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Restaurant not found or not updated' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating restaurant:', error);
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
  }
} 