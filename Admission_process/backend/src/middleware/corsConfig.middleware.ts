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

    if (process.env.FRONTEND_URL === '*' || process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }

    const isExplicitlyAllowed = allAllowedOrigins.includes(origin);
    const isCloudflarePages = origin.endsWith('.pages.dev') || origin.includes('pages.dev');
    const isTunnel =
      origin.endsWith('.trycloudflare.com') ||
      origin.endsWith('.loca.lt') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.ngrok.io');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isPrivateIP = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (isExplicitlyAllowed || isCloudflarePages || isTunnel || isLocalhost || isPrivateIP) {
      return callback(null, true);
    }

    // Default fallback: return true so browser receives valid CORS headers
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
