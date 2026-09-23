import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as hodController from '../controllers/hod.controller';

const router = express.Router();

// Protect all HOD routes
router.use(authMiddleware as any);
router.use(authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any);

// ─── HOD Dashboard & Department Routes ──────────────────────────────────────────
router.get('/dashboard', hodController.getHodDashboard as any);
router.get('/department', hodController.getHodDepartment as any);

export default router;
