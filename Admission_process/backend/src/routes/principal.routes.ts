import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as principalController from '../controllers/principal.controller';
import * as admissionController from '../controllers/admission.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles('PRINCIPAL'));

// Overview
router.get('/dashboard', principalController.getDashboardData);
router.get('/analytics', principalController.getAnalyticsData);

// Admissions
router.get('/admissions/stats', principalController.getAdmissionsStats);
router.get('/admissions/list', principalController.listAdmissions);
router.get('/admissions/pending', principalController.getPendingAdmissions);
router.get('/admissions/:id/documents/:field', admissionController.viewAdmissionDocument);
router.get('/students/:studentId/documents', admissionController.getStudentDocuments);
router.get('/admissions/:id', principalController.getAdmissionById);
router.put('/admissions/:id/decide', principalController.decideAdmission);
router.post('/admissions/:id/approve', principalController.decideAdmission);
router.post('/admissions/:id/reject', principalController.decideAdmission);
router.put('/admissions/bulk/approve', principalController.bulkApproveAdmissions);

// Budget Requests
router.get('/budget/pending', principalController.getPendingBudgets);
router.put('/budget/:id/decide', principalController.decideBudget);

// Staff Management
router.get('/staff', principalController.getStaffList);

// Leaves & Staff Requests
router.get('/leaves/pending', principalController.getPendingLeaves);
router.put('/leaves/:id/decide', principalController.decideLeave);

// Curriculum & Appeals
router.get('/curriculum/pending', principalController.getPendingCurriculumChanges);
router.put('/curriculum/:id/decide', principalController.decideCurriculumChange);

// Announcements
router.get('/announcements', principalController.getAnnouncements);
router.post('/announcements', principalController.postAnnouncement);

// Strategic goals
router.get('/strategic-goals', principalController.getStrategicGoals);
router.post('/strategic-goals/:id/review', principalController.reviewStrategicGoal);

// Compliance status
router.get('/compliance/status', principalController.getComplianceStatus);

// Report Generation
router.get('/reports/generate', principalController.generateReport);

export default router;
