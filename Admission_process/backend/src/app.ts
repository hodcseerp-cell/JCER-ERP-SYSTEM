// Trigger reload with correct uppercase drive casing
import express, { Application, Request, Response, RequestHandler } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import compression from 'compression';

import { corsConfig } from './middleware/corsConfig.middleware';
import { globalLimiter } from './middleware/rateLimit.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { idempotencyMiddleware } from './middleware/idempotency.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';

import authRoutes from './routes/auth.routes';
import systemRoutes from './routes/system.routes';
import adminRoutes from './routes/admin.routes';
import adminOfficeRouter from './routes/admin-office.routes';
import { getBranches, downloadHandbook } from './controllers/admission.controller';
import { studentRouter, applicationRouter, adminAdmissionRouter } from './routes/admission.routes';
import principalRoutes from './routes/principal.routes';
const app: Application = express();

// Trust first proxy hop (e.g. Nginx, Cloudflare, Load Balancer)
app.set('trust proxy', 1);

// 1. CORS Configuration (Perimeter Defense - MUST run before all other middleware and routes)
app.use(corsConfig);
app.options('*', corsConfig);

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const compressionMiddleware = compression();
app.use((req, res, next) => (compressionMiddleware as any)(req, res, next));

// 2. Body & Cookie Parsers (Must run before logging, rate limiting, and routing)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 3. Structured Request Logging (Correlation ID & Latency tracking)
app.use(loggingMiddleware);

// 4. Rate Limiting (Perimeter Defense)
app.use('/api', globalLimiter);

// 5. Idempotency Guard (Mutation double-submit protection)
app.use('/api', idempotencyMiddleware);

// ── Serve uploaded files as static ────────────────────────────────────────────
// Files are stored at <project_root>/uploads/ and served at /uploads/:filename
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'College ERP API Server is running',
    timestamp: new Date()
  });
});
// ── API Routes ────────────────────────────────────────────────────────────────

const v1Router = express.Router();

// Auth routes
v1Router.use('/auth', authRoutes);

// System routes
v1Router.use('/system', systemRoutes);

// Branches list (public-ish, used by admission Step 1)
v1Router.get('/branches', getBranches as any);

// Public Admission Handbook (No authentication required)
v1Router.get('/public/handbook', downloadHandbook as any);
v1Router.get('/public/admission-handbook.pdf', downloadHandbook as any);
v1Router.get('/application/handbook', downloadHandbook as any);

// Districts list (used by admission Step 4 dropdown)
v1Router.get('/address/districts', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [
      { id: '1', name: 'Bagalkot' },
      { id: '2', name: 'Ballari (Bellary)' },
      { id: '3', name: 'Belagavi (Belgaum)' },
      { id: '4', name: 'Bengaluru (Bangalore) Rural' },
      { id: '5', name: 'Bengaluru (Bangalore) Urban' },
      { id: '6', name: 'Bidar' },
      { id: '7', name: 'Chamarajanagar' },
      { id: '8', name: 'Chikkaballapur' },
      { id: '9', name: 'Chikkamagaluru (Chikmagalur)' },
      { id: '10', name: 'Chitradurga' },
      { id: '11', name: 'Dakshina Kannada' },
      { id: '12', name: 'Davanagere' },
      { id: '13', name: 'Dharwad' },
      { id: '14', name: 'Gadag' },
      { id: '15', name: 'Hassan' },
      { id: '16', name: 'Haveri' },
      { id: '17', name: 'Kalaburagi (Gulbarga)' },
      { id: '18', name: 'Kodagu (Coorg)' },
      { id: '19', name: 'Kolar' },
      { id: '20', name: 'Koppal' },
      { id: '21', name: 'Mandya' },
      { id: '22', name: 'Mysuru (Mysore)' },
      { id: '23', name: 'Raichur' },
      { id: '24', name: 'Ramanagara' },
      { id: '25', name: 'Shivamogga (Shimoga)' },
      { id: '26', name: 'Tumakuru (Tumkur)' },
      { id: '27', name: 'Udupi' },
      { id: '28', name: 'Uttara Kannada (Karwar)' },
      { id: '29', name: 'Vijayapura (Bijapur)' },
      { id: '30', name: 'Yadgir' }
    ]
  });
});

// Student admission endpoints
v1Router.use('/student', studentRouter);

// Application endpoints
v1Router.use('/application', applicationRouter);

// Admin admission management
v1Router.use('/admin', adminAdmissionRouter);

// Admin office endpoints
v1Router.use('/admin', adminOfficeRouter);

// Admin dashboard + profile routes
v1Router.use('/admin', adminRoutes);

// Principal Dashboard routes
v1Router.use('/principal', principalRoutes);

// Mount the v1 router to both versioned and legacy base paths
app.use('/api', v1Router);
app.use('/api/v1', v1Router);

// ── Global 404 handler ────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
