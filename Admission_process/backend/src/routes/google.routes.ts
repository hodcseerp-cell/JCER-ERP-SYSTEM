import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { resolveHodDepartmentScope } from '../middleware/hodScope.middleware';
import * as googleSheetsController from '../controllers/googleSheets.controller';

const router = express.Router();

// ── Google OAuth Endpoints ──────────────────────────────────────────────────
router.get(
  '/account',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.getCurrentUserGoogleAccount as any
);

router.get(
  '/oauth/status',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.getCurrentUserGoogleAccount as any
);

router.get(
  '/oauth/auth-url',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.getGoogleOAuthAuthUrl as any
);

router.get(
  '/connect',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.getGoogleOAuthAuthUrl as any
);

router.get(
  '/oauth/mock-connect',
  googleSheetsController.mockConnectGoogleOAuth as any
);

router.post(
  '/oauth/callback',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.handleGoogleOAuthCallback as any
);

router.post(
  '/oauth/disconnect',
  authMiddleware as any,
  authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any,
  resolveHodDepartmentScope as any,
  googleSheetsController.disconnectGoogleOAuth as any
);

export default router;
