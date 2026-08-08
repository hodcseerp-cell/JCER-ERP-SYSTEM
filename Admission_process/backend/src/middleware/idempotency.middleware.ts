import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  // Only enforce idempotency for mutating requests (POST, PUT, PATCH, DELETE)
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isMutating) {
    return next();
  }

  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  if (!idempotencyKey) {
    return next();
  }

  const cacheKey = `idempotency:${idempotencyKey}`;

  try {
    const cachedRecord = await redis.get(cacheKey);

    if (cachedRecord) {
      if (cachedRecord === 'processing') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A request with this idempotency key is already in progress.'
        });
      }

      try {
        const parsed = JSON.parse(cachedRecord);
        res.setHeader('x-cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.status(parsed.status).send(parsed.body);
      } catch (parseErr) {
        // If caching data is corrupted, clear it and let request proceed
        await redis.del(cacheKey);
      }
    }

    // Set lock state (expires in 1 hour in case of unexpected worker crash/hanging request)
    await redis.setex(cacheKey, 3600, 'processing');

    // Intercept res.send to cache response body once completed
    const originalSend = res.send;
    res.send = function (body: any): Response {
      // Restore original send function
      res.send = originalSend;

      // Only cache successful requests (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cacheData = JSON.stringify({
          status: res.statusCode,
          body: body
        });
        
        // Cache response for 24 hours
        redis.setex(cacheKey, 86400, cacheData).catch((err: any) => {
          console.error('Failed to store response in idempotency cache:', err);
        });
      } else {
        // If request failed, delete key to allow client to retry
        redis.del(cacheKey).catch((err: any) => {
          console.error('Failed to clear idempotency lock key on request failure:', err);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next();
  }
};
