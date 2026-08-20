import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { uploadProvisionalDocMiddleware } from '../middleware/upload.middleware';
import * as provisionalController from '../controllers/provisional.controller';

const router = express.Router();

// Student-facing routes
router.get('/config', authMiddleware, provisionalController.getProvisionalConfig);
router.get('/my-admission', authMiddleware, provisionalController.getMyProvisionalAdmission);
router.get('/historical-docs', authMiddleware, provisionalController.getStudentHistoricalSemesterDocs);
router.post('/step1', authMiddleware, provisionalController.saveProvisionalStep1);
router.put('/step2', authMiddleware, provisionalController.saveProvisionalStep2);
router.post('/documents', authMiddleware, uploadProvisionalDocMiddleware, provisionalController.uploadProvisionalDocument);
router.post('/submit', authMiddleware, provisionalController.submitProvisionalAdmission);
router.get('/acknowledgement/:id', authMiddleware, provisionalController.getProvisionalAcknowledgement);

// Admin-facing routes
router.get('/admin/list', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'PRINCIPAL'), provisionalController.listProvisionalAdmissions);
router.post('/admin/:id/verify-doc', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), provisionalController.verifyProvisionalDocument);
router.post('/admin/:id/action', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), provisionalController.processProvisionalAction);
router.post('/admin/bulk-approve', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), provisionalController.bulkApproveProvisionalAdmissions);

export default router;
