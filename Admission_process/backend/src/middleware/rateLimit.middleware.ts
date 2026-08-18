import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter applied to all `/api` routes.
 * Max 1000 requests per 1 minute per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
  },
});

const isDev = process.env.NODE_ENV === 'development';

/**
 * Environment-aware rate limiter for authentication endpoints (login, register, OTP).
 * Development: Max 1000 requests per 1 minute per IP.
 * Production: Max 30 attempts per 1 minute per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please wait 1 minute and try again.',
  },
  skipSuccessfulRequests: false,
});

/**
 * Moderate rate limiter for token refresh endpoint.
 * Max 20 attempts per 1 minute per IP.
 */
export const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many refresh attempts. Please try again shortly.',
  },
});

/**
 * Strict rate limiter for sensitive operations:
 * - Fee payments
 * - Marks updates
 * - Credential dispatch
 * Max 30 attempts per 1 minute per IP.
 */
export const sensitiveOpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many sensitive operations requested from this IP. Please try again after 1 minute.',
  },
});

