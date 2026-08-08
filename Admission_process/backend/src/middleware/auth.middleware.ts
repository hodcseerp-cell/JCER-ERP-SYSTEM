import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import User from '../models/User';
import redisService from '../services/redis.service';
import logger from '../utils/logger.util';
import { UnauthorizedError } from '../utils/error.util';
import { contextStorage } from '../utils/context.util';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    tokenVersion: number;
  };
  correlationId?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Verify token signature and expiry
    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      throw new UnauthorizedError('Invalid or expired token.');
    }

    // 2. Database verification (zero-trust: always re-verify user status and tokenVersion)
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(`User account is ${user.status.toLowerCase()}.`);
    }

    if (typeof decoded.tv === 'number' && decoded.tv !== user.tokenVersion) {
      throw new UnauthorizedError('Session invalidated due to password or permission change. Please log in again.');
    }

    // Attach verified user payload to the request object
    req.user = {
      id: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    // Run the rest of the request lifecycle in the AsyncLocalStorage context
    return contextStorage.run({ userId: user.id, role: user.role }, () => {
      next();
    });
  } catch (error: any) {
    const status = error.status || 401;
    logger.warn(`Auth failure: ${error.message}`, { path: req.path, ip: req.ip });
    return res.status(status).json({ error: error.message || 'Authentication failed.' });
  }
};

