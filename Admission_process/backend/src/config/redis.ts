import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let useInMemory = false;
const inMemoryStore = new Map<string, { value: string; expiry: number | null }>();

// Resilient in-memory fallback store
const memoryClient = {
  get: async (key: string): Promise<string | null> => {
    const item = inMemoryStore.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      inMemoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  setex: async (key: string, seconds: number, value: string): Promise<string> => {
    const expiry = Date.now() + seconds * 1000;
    inMemoryStore.set(key, { value, expiry });
    return 'OK';
  },
  del: async (key: string): Promise<number> => {
    const deleted = inMemoryStore.delete(key);
    return deleted ? 1 : 0;
  },
  flushall: async (): Promise<string> => {
    inMemoryStore.clear();
    return 'OK';
  },
  flushDb: async (): Promise<string> => {
    inMemoryStore.clear();
    return 'OK';
  },
  isReady: true,
};

let client: RedisClientType | null = null;
let resolvedRedisUrl: string | null = null;

if (process.env.NODE_ENV !== 'test') {
  // 1. Prioritize REDIS_URL / Railway private & public URLs
  let rawRedisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDIS_PUBLIC_URL || process.env.REDISURL;
  if (rawRedisUrl) {
    rawRedisUrl = rawRedisUrl.trim().replace(/^["']|["']$/g, '');
  }

  // 2. Legacy / Individual Host & Port configuration
  const host = (process.env.REDIS_HOST || process.env.REDISHOST || '').trim().replace(/^["']|["']$/g, '');
  const port = (process.env.REDIS_PORT || process.env.REDISPORT || '6379').trim().replace(/^["']|["']$/g, '');
  const password = (process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || '').trim().replace(/^["']|["']$/g, '');

  if (rawRedisUrl) {
    resolvedRedisUrl = rawRedisUrl;
  } else if (host) {
    resolvedRedisUrl = password
      ? `redis://:${password}@${host}:${port}`
      : `redis://${host}:${port}`;
  } else if (process.env.NODE_ENV !== 'production') {
    // In local development only, fallback to localhost
    resolvedRedisUrl = 'redis://127.0.0.1:6379';
  } else {
    // In production without REDIS_URL, do NOT default to 127.0.0.1:6379
    resolvedRedisUrl = null;
    useInMemory = true;
  }

  if (resolvedRedisUrl) {
    client = createClient({
      url: resolvedRedisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            useInMemory = true;
            return false; // stop reconnecting
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      // In production or development, log cleanly without unhandled crash
      useInMemory = true;
    });

    client.on('connect', () => {
      useInMemory = false;
    });
  }
}

/**
 * Initializes and connects to Redis during server startup.
 */
export async function initRedis(): Promise<boolean> {
  if (!client || !resolvedRedisUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.log('ℹ️ No REDIS_URL configured. Operating with in-memory session/cache store.');
    }
    useInMemory = true;
    return false;
  }

  try {
    console.log('Connecting to Redis...');
    await client.connect();
    console.log('Redis connected successfully.');
    useInMemory = false;
    return true;
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Could not connect to Redis server at REDIS_URL. Operating with resilient in-memory store.');
    } else {
      console.warn('⚠️ Could not connect to local Redis server, using in-memory store instead.');
    }
    useInMemory = true;
    return false;
  }
}

const redisClient = {
  get: async (key: string): Promise<string | null> => {
    if (useInMemory || !client || !client.isReady) return memoryClient.get(key);
    try {
      return await client.get(key);
    } catch {
      return memoryClient.get(key);
    }
  },
  setex: async (key: string, seconds: number, value: string): Promise<string> => {
    if (useInMemory || !client || !client.isReady) return memoryClient.setex(key, seconds, value);
    try {
      return await client.set(key, value, { EX: seconds }) as string;
    } catch {
      return memoryClient.setex(key, seconds, value);
    }
  },
  del: async (key: string): Promise<number> => {
    if (useInMemory || !client || !client.isReady) return memoryClient.del(key);
    try {
      return await client.del(key);
    } catch {
      return memoryClient.del(key);
    }
  },
  flushall: async (): Promise<string> => {
    if (useInMemory || !client || !client.isReady) return memoryClient.flushall();
    try {
      return await client.flushAll();
    } catch {
      return memoryClient.flushall();
    }
  },
  flushDb: async (): Promise<string> => {
    if (useInMemory || !client || !client.isReady) return memoryClient.flushDb();
    try {
      return await client.flushDb();
    } catch {
      return memoryClient.flushDb();
    }
  },
  get isReady(): boolean {
    return !useInMemory && (client ? client.isReady : false);
  }
};

export default redisClient;
