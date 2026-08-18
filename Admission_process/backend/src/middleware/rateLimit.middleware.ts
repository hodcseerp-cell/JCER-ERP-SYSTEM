import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter applied to all `/api` routes.
 * Max 1000 requests per 15 minutes per IP.
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
 * Production: Max 5 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: isDev
      ? 'Too many authentication attempts. Please wait 1 minute and try again.'
      : 'Too many authentication attempts. Please try again after 1 minutes.',
  },
  skipSuccessfulRequests: false,
});

/**
 * Moderate rate limiter for token refresh endpoint.
 * Max 20 attempts per 15 minutes per IP.
 */
export const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
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
 * Max 30 attempts per 15 minutes per IP.
 */
export const sensitiveOpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many sensitive operations requested from this IP. Please try again after 1 minutes.',
  },
});
