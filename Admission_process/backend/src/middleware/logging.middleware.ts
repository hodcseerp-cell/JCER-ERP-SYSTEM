import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.util';

/**
 * Express middleware to track correlation ID, request ID, and log request lifecycle.
 * Injects `correlationId` into the request object and exposes it in the response headers.
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime();
  
  // Track/generate correlation IDs
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const ip = req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  const method = req.method;
  const path = req.originalUrl;

  logger.info(`Incoming Request: ${method} ${path}`, {
    correlationId,
    ip,
    userAgent,
    method,
    path,
  });

  // Intercept the end of the request to calculate latency
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const userId = (req as any).user?.id || 'anonymous';

    logger.info(`Response Sent: ${method} ${path} [Status: ${res.statusCode}] - ${durationMs}ms`, {
      correlationId,
      status: res.statusCode,
      durationMs,
      userId,
    });
  });

  next();
};
