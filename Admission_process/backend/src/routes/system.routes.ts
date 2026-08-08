import { Router } from 'express';
import * as systemController from '../controllers/system.controller';

const router = Router();

router.get('/config', systemController.getConfig as any);
router.get('/health', systemController.getHealth as any);
router.get('/db-status', ((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end();
  }
  next();
}) as any, systemController.dbStatus as any);
router.get('/version', systemController.getVersion as any);
router.get('/features', systemController.getFeatures as any);

export default router;
