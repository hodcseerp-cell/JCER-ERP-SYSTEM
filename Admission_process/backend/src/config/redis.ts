import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let useInMemory = false;
const inMemoryStore = new Map<string, { value: string; expiry: number | null }>();

// Simple in-memory fallback interface
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
  connect: async () => {},
  on: () => {},
};

let redisClient: any = memoryClient;

if (process.env.NODE_ENV !== 'test') {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD || '';
  
  const redisUrl = password 
    ? `redis://:${password}@${host}:${port}` 
    : `redis://${host}:${port}`;

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('Redis reconnection failed 3 times. Falling back to in-memory store.');
          useInMemory = true;
          return false; // stop reconnecting
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err.message || err);
    useInMemory = true;
  });

  client.on('connect', () => {
    console.log('Redis connected successfully');
    useInMemory = false;
  });

  // Attempt async connection
  client.connect().catch((err) => {
    console.warn('Could not connect to Redis server, using in-memory store instead.', err.message || err);
    useInMemory = true;
  });

  redisClient = {
    get: async (key: string) => {
      if (useInMemory || !client.isReady) return memoryClient.get(key);
      try {
        return await client.get(key);
      } catch (err) {
        return memoryClient.get(key);
      }
    },
    setex: async (key: string, seconds: number, value: string) => {
      if (useInMemory || !client.isReady) return memoryClient.setex(key, seconds, value);
      try {
        // In node-redis v4, setex is set with options
        return await client.set(key, value, { EX: seconds });
      } catch (err) {
        return memoryClient.setex(key, seconds, value);
      }
    },
    del: async (key: string) => {
      if (useInMemory || !client.isReady) return memoryClient.del(key);
      try {
        return await client.del(key);
      } catch (err) {
        return memoryClient.del(key);
      }
    }
  };
}

export default redisClient;
