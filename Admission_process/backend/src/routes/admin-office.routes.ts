import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as adminOfficeController from '../controllers/admin-office.controller';

const router = express.Router();

// Enforce auth and RBAC for all office endpoints
router.use(authMiddleware);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// Notifications/Announcements
router.get('/notifications', adminOfficeController.getNotifications);
router.post('/notifications', adminOfficeController.createNotification);
router.put('/notifications/:id/publish', adminOfficeController.publishNotification);

export default router;
