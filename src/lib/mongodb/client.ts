import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let activeDb: Db | null = null;

// Global cache to prevent multiple connections during HMR in development
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoMemoryServer: any;
}

async function createClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/university_lab_audit';

  try {
    // Attempt standard connection with 2.5s connection timeout
    const candidateClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    });
    await candidateClient.connect();
    // Test ping
    await candidateClient.db().command({ ping: 1 });
    console.log('[MongoDB] Connected successfully to primary URI:', uri);
    return candidateClient;
  } catch (primaryErr) {
    console.warn('[MongoDB] Primary connection failed, initializing embedded MongoDB engine...', (primaryErr as Error).message);

    // Fallback: Spin up embedded in-memory MongoDB instance for seamless local dev/academic demo
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      if (!global._mongoMemoryServer) {
        global._mongoMemoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: process.env.MONGODB_DB_NAME || 'university_lab_audit',
          },
        });
      }
      const memoryUri = global._mongoMemoryServer.getUri();
      console.log('[MongoDB] Embedded MongoDB Memory Server active at:', memoryUri);
      const memoryClient = new MongoClient(memoryUri);
      await memoryClient.connect();
      return memoryClient;
    } catch (fallbackErr) {
      console.error('[MongoDB] Failed to initialize embedded MongoDB engine:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClient();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      clientPromise = createClient();
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
    console.log('[MongoDB] Audit indexes verified successfully.');
  } catch (err) {
    console.error('[MongoDB] Error verifying audit indexes:', err);
  }
}
