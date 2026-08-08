import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as adminController from '../controllers/admin.controller';
import * as userManagementController from '../controllers/user-management.controller';
import * as onboardingController from '../controllers/onboarding.controller';
import multer from 'multer';

import { handbookUpload } from '../middleware/upload.middleware';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// Dashboard & Stats
router.get('/dashboard', adminController.getDashboardData);
router.get('/stats', adminController.getStats);
router.get('/analytics', adminController.getAnalyticsData);
router.get('/profile', adminController.getProfile);
router.post('/credentials/dispatch', adminController.dispatchCredentials);
router.get('/credentials/pending', adminController.getPendingCredentials);
router.post('/credentials/bulk-dispatch', adminController.bulkDispatchCredentials);

// User Management (Students, Teachers, HODs, Principals, Parents)
router.get('/users/students', userManagementController.getStudents);
router.put('/users/students/:id', userManagementController.updateStudent);
router.get('/users/principals', userManagementController.getPrincipals);

// Settings and Logs
router.get('/logs', adminController.getAuditLogs);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/settings/handbook', handbookUpload.single('handbookPdf'), adminController.uploadHandbook);

// Bulk Onboarding (USN Registry & Students)
router.post('/onboarding/usn-registry', upload.single('file'), onboardingController.uploadUSNRegistry);
router.get('/onboarding/usn-registry', onboardingController.getUSNRegistry);
router.post('/onboarding/students/bulk', upload.single('file'), onboardingController.bulkUploadStudents);

export default router;
