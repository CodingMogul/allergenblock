// lib/mongodb.ts
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Missing MONGODB_URI in .env or environment variables');
}

// After the check, we know uri is string
const mongoUri: string = uri;

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

/**
 * Returns a cached MongoClient, or creates a new one if needed.
 */
function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

/**
 * Returns the default database from the Mongo client.
 */
export async function connectToDatabase(): Promise<Db> {
  // Check if the DB name is provided
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error('Missing MONGODB_DB in .env or environment variables');
  }

  const mongoClient = await getMongoClient();
  const db = mongoClient.db(dbName);
  
  // Create geospatial index if it doesn't exist
  try {
    await db.collection("restaurants").createIndex({ location: "2dsphere" });
  } catch (error) {
    console.error('Error creating geospatial index:', error);
  }
  
  return db;
}
