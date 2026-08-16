import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as promotionController from '../controllers/promotion.controller';

const router = express.Router();

// Enforce auth and RBAC for all promotion routes
router.use(authMiddleware);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN'));

router.get('/filters', promotionController.getPromotionFilters);
router.get('/students', promotionController.getPromotionStudents);
router.post('/preview', promotionController.previewPromotion);
router.post('/bulk', promotionController.bulkPromoteStudents);
router.get('/history', promotionController.getPromotionHistory);
router.get('/batches/:id', promotionController.getPromotionBatchDetails);

export default router;
