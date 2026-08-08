import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/jwt.util';
import User from '../models/User';
import redisService from './redis.service';

// Refresh Token uses a SEPARATE secret from Access Token
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'college_erp_refresh_secret_key_min_32_chars_secure';
const REFRESH_TOKEN_EXPIRY = '7d';

class AuthService {
  /**
   * Generates an Access Token and a Refresh Token for a valid user.
   * Access Token: uses jwt.util (1h expiry, shared secret)
   * Refresh Token: separate secret, 7d expiry, stored in Redis
   */
  public async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Generate short-lived Access Token including tv
    const accessToken = generateToken({ id: user.id, role: user.role, tv: user.tokenVersion });

    // 2. Generate long-lived Refresh Token with a separate secret and tv
    const refreshToken = jwt.sign({ id: user.id, tv: user.tokenVersion }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY as any,
    });

    // 3. Store refresh token in Redis session store (TTL: 7 days)
    await redisService.setSession(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Validates a refresh token and issues new tokens if the session is still active.
   */
  public async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: any } | null> {
    try {
      // 1. Verify refresh token signature
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; tv: number };
      
      // 2. Check Redis — ensure this is the current active session (not revoked)
      const activeRefreshToken = await redisService.getSession(decoded.id);
      if (!activeRefreshToken || activeRefreshToken !== refreshToken) {
        return null;
      }

      // 3. Ensure user is still ACTIVE in the DB and tv matches
      const user = await User.findByPk(decoded.id);
      if (!user || user.status !== 'ACTIVE' || decoded.tv !== user.tokenVersion) {
        return null;
      }

      // 4. Rotate: generate fresh tokens and update Redis
      const tokens = await this.generateTokens(user);
      return { ...tokens, user };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revokes the user's session on logout.
   */
  public async revokeSession(userId: string): Promise<void> {
    await redisService.deleteSession(userId);
    const user = await User.findByPk(userId);
    if (user) {
      await user.increment('tokenVersion');
    }
  }
}

export default new AuthService();
