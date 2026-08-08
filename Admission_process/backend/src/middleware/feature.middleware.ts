import { Request, Response, NextFunction } from 'express';
import SystemConfiguration from '../models/SystemConfiguration';
import logger from '../utils/logger.util';

export const featureEnabled = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      // 1. Fetch configurations from database (as fallback)
      let config = await SystemConfiguration.findOne();
      if (!config) {
        config = await SystemConfiguration.create({});
      }
      const dbFeatures = config.features || {};

      // 2. Load environmental variable override (primary source of truth)
      const envKey = `FEATURE_${featureKey.toUpperCase()}`;
      const envVal = process.env[envKey];

      let isEnabled = false;
      if (envVal !== undefined) {
        isEnabled = envVal === 'true';
      } else {
        isEnabled = !!dbFeatures[featureKey];
      }

      // 3. Block, log structured warning, and return 403 Forbidden
      if (!isEnabled) {
        const userId = (req as any).user?.id || 'Anonymous';
        
        logger.warn(`[Feature Disabled] Access Attempt Blocked`, {
          module: featureKey,
          path: req.originalUrl,
          userId,
          ip: req.ip,
          time: new Date().toISOString()
        });

        return res.status(403).json({
          success: false,
          code: 'MODULE_DISABLED',
          message: `The '${featureKey}' module is currently disabled in this deployment.`
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
