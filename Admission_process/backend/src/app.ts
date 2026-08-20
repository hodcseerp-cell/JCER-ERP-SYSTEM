// Trigger reload with correct uppercase drive casing
import express, { Application, Request, Response, RequestHandler, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import compression from 'compression';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth.middleware';

import { corsConfig } from './middleware/corsConfig.middleware';
import { globalLimiter } from './middleware/rateLimit.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { idempotencyMiddleware } from './middleware/idempotency.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';

import fs from 'fs';
import * as r2Service from './services/r2.service';
import logger from './utils/logger.util';
import authRoutes from './routes/auth.routes';
import systemRoutes from './routes/system.routes';
import adminRoutes from './routes/admin.routes';
import adminOfficeRouter from './routes/admin-office.routes';
import { getBranches, downloadHandbook } from './controllers/admission.controller';
import { studentRouter, applicationRouter, adminAdmissionRouter } from './routes/admission.routes';
import principalRoutes from './routes/principal.routes';
import provisionalRoutes from './routes/provisional.routes';
import promotionRoutes from './routes/promotion.routes';
const app: Application = express();

// Trust first proxy hop (e.g. Nginx, Cloudflare, Load Balancer)
app.set('trust proxy', 1);

// 1. CORS Configuration (Perimeter Defense - MUST run before all other middleware and routes)
app.use(corsConfig);

// Fast-path OPTIONS preflight requests for all endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  return next();
});

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

// Disable browser caching globally on dynamic API requests
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 4. Rate Limiting (Perimeter Defense)
app.use('/api', globalLimiter);

// 5. Idempotency Guard (Mutation double-submit protection)
app.use('/api', idempotencyMiddleware);

// Serve public uploads (avatars, handbooks) directly
app.use('/uploads/avatars', express.static(path.join(process.cwd(), 'uploads', 'avatars')));
app.use('/uploads/handbookPdf', express.static(path.join(process.cwd(), 'uploads', 'handbookPdf')));

// Serve uploaded files securely - require authentication and check ownership for application documents
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/avatars/') || req.path.startsWith('/handbookPdf/')) {
    return next();
  }
  return (authMiddleware as any)(req, res, next);
}, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const filePath = req.path;
  const parts = filePath.split('/');

  // Reject path traversal attempts
  if (req.originalUrl.includes('..') || req.path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path traversal detected.' });
  }

  // Local handbook & avatars are public
  if (parts.includes('handbookPdf') || parts.includes('avatars')) {
    return next();
  }

  // Extract owner student ID from file path
  // Local upload path format: /admissions/:studentUserId/:documentType/:filename
  const admissionsIdx = parts.indexOf('admissions');
  if (admissionsIdx !== -1 && parts[admissionsIdx + 1]) {
    const studentUserId = parts[admissionsIdx + 1];

    // Enforce student tenant isolation: students can only access their own documents
    if (req.user!.role === 'STUDENT' && req.user!.id !== studentUserId) {
      return res.status(403).json({ error: 'Access Denied. You do not own this document.' });
    }
  }

  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'College ERP API Server is running',
    timestamp: new Date()
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'JCER Admission Backend',
    timestamp: new Date().toISOString(),
  });
});
// ── API Routes ────────────────────────────────────────────────────────────────

const v1Router = express.Router();

// Auth routes
v1Router.use('/auth', authRoutes);

// Document viewer route for R2 object keys and static uploads
v1Router.get('/documents/view/*', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const rawKey = req.params[0] || '';
    if (!rawKey) {
      return res.status(400).json({ error: 'Document key is required.' });
    }

    const key = decodeURIComponent(rawKey);

    if (key.includes('..')) {
      return res.status(400).json({ error: 'Invalid path traversal detected.' });
    }

    const ext = path.extname(key).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    if (key.startsWith('/uploads/') || key.startsWith('uploads/')) {
      const fullPath = path.join(process.cwd(), key.replace(/^\/?uploads\/?/, 'uploads'));
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      } else {
        return res.status(404).json({ error: 'File not found on disk.' });
      }
    }

    try {
      const buffer = await r2Service.getFile(key);
      return res.send(buffer);
    } catch (r2Err) {
      logger.error(`[DocumentView] Error fetching object '${key}' from R2:`, r2Err);
      return res.status(404).json({ error: 'File not found in storage.' });
    }
  } catch (err) {
    return next(err);
  }
});

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

// Provisional Admission endpoints
v1Router.use('/provisional', provisionalRoutes);

// Promotion endpoints
v1Router.use('/admin/promotion', promotionRoutes);

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
