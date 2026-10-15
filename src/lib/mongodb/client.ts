import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let activeDb: Db | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _realMongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Creates and verifies a real connection to MongoDB.
 * Connects to the URI specified in MONGODB_URI (local mongod on port 27017 or MongoDB Atlas).
 */
async function createRealClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/university_lab_audit';

  try {
    const candidateClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await candidateClient.connect();
    // Verify connection by pinging admin database
    await candidateClient.db().command({ ping: 1 });
    console.log('[MongoDB] Connected successfully to real MongoDB cluster:', uri.replace(/:[^:@]+@/, ':****@'));
    return candidateClient;
  } catch (err: any) {
    const msg = `[MongoDB Error] Unable to connect to real MongoDB instance at "${uri}".\n` +
      `Ensure either:\n` +
      `  1) Local MongoDB daemon is running ('brew services start mongodb-community@7.0' or 'mongod'), OR\n` +
      `  2) Provide a valid MongoDB Atlas connection string in your .env file as MONGODB_URI.\n` +
      `Original Error: ${err?.message}`;
    console.error(msg);
    throw new Error(msg);
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._realMongoClientPromise) {
      global._realMongoClientPromise = createRealClient();
    }
    clientPromise = global._realMongoClientPromise;
  } else {
    if (!clientPromise) {
      clientPromise = createRealClient();
    }
  }

  client = await clientPromise;
  return client;
}

export async function getMongoDb(): Promise<Db> {
  if (activeDb) return activeDb;
  const mongoClient = await getMongoClient();
  const dbName = process.env.MONGODB_DB_NAME || 'university_lab_audit';
  activeDb = mongoClient.db(dbName);
  return activeDb;
}

export async function ensureMongoIndexes(): Promise<void> {
  try {
    const db = await getMongoDb();
    const collection = db.collection('audit_events');

    await collection.createIndex({ timestamp: -1 }, { name: 'idx_audit_timestamp' });
    await collection.createIndex({ event_type: 1 }, { name: 'idx_audit_event_type' });
    await collection.createIndex({ entity_type: 1, entity_id: 1 }, { name: 'idx_audit_entity' });
    await collection.createIndex({ actor_user_id: 1 }, { name: 'idx_audit_actor' });
    console.log('[MongoDB] Real audit indexes verified successfully.');
  } catch (err) {
    console.error('[MongoDB] Error verifying audit indexes on real MongoDB:', err);
  }
}
