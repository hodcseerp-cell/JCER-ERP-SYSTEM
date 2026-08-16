import { Router } from 'express';
import * as systemController from '../controllers/system.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';

const router = Router();

router.get('/config', systemController.getConfig as any);
router.get('/health', systemController.getHealth as any);
router.get('/db-status', authMiddleware as any, authorizeRoles('SUPER_ADMIN') as any, systemController.dbStatus as any);
router.get('/version', systemController.getVersion as any);
router.get('/features', systemController.getFeatures as any);

export default router;
