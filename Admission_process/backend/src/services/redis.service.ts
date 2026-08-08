import redisClient from '../config/redis';

class RedisService {
  /**
   * Stores the active refresh token for a user session (TTL: 7 days)
   */
  public async setSession(userId: string, token: string): Promise<void> {
    const seconds = 7 * 24 * 60 * 60; // 7 days
    await redisClient.setex(`session:${userId}`, seconds, token);
  }

  /**
   * Retrieves the active refresh token for a user session
   */
  public async getSession(userId: string): Promise<string | null> {
    return await redisClient.get(`session:${userId}`);
  }

  /**
   * Deletes the user session refresh token (revocation)
   */
  public async deleteSession(userId: string): Promise<void> {
    await redisClient.del(`session:${userId}`);
  }

  /**
   * Retrieves JSON parsed cache data
   */
  public async getCache(key: string): Promise<any | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`Redis getCache failed for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Stores stringified JSON cache data with TTL
   */
  public async setCache(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (err) {
      console.warn(`Redis setCache failed for key ${key}:`, err);
    }
  }

  /**
   * Deletes a cache key
   */
  public async deleteCache(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn(`Redis deleteCache failed for key ${key}:`, err);
    }
  }
}

export default new RedisService();
