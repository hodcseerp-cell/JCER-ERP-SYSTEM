import cors from 'cors';

// Retrieve allowed origins from environment
const allowedOriginsEnv = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

const defaultAllowedOrigins = [
  'https://jcer-admission-portal.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allAllowedOrigins = [...new Set([...allowedOriginsEnv, ...defaultAllowedOrigins])];

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isExplicitlyAllowed = allAllowedOrigins.includes(origin) || allAllowedOrigins.includes('*');
    const isCloudflarePages = origin.endsWith('.pages.dev') || origin.includes('pages.dev');
    const isTunnel =
      origin.endsWith('.trycloudflare.com') ||
      origin.endsWith('.loca.lt') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.ngrok.io');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (isExplicitlyAllowed || isCloudflarePages || isTunnel || isLocalhost) {
      return callback(null, true);
    }

    // Default fallback to allow origin dynamically so browser receives proper CORS headers
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-correlation-id',
    'x-idempotency-key',
  ],
  exposedHeaders: ['x-correlation-id', 'Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
