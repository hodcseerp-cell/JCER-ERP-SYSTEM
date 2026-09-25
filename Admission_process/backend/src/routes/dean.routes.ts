import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as deanController from '../controllers/dean.controller';

const router = express.Router();

router.use(authMiddleware as any);
router.use(authorizeRoles('DEAN', 'SUPER_ADMIN') as any);

// ─── Dashboard Overview ────────────────────────────────────────────────────────
router.get('/dashboard', deanController.getDashboardData as any);

// ─── Academic Years ────────────────────────────────────────────────────────────
router.get('/academic-years', deanController.getAcademicYears as any);
router.post('/academic-years', deanController.createAcademicYear as any);
router.put('/academic-years/:id', deanController.updateAcademicYear as any);

// ─── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', deanController.getDepartments as any);
router.post('/departments', deanController.createDepartment as any);
router.put('/departments/:id', deanController.updateDepartment as any);
router.get('/departments/:id/academic-info', deanController.getDepartmentAcademicInfo as any);

// ─── Semesters ─────────────────────────────────────────────────────────────────
router.get('/semesters', deanController.getSemesters as any);
router.post('/semesters', deanController.createSemester as any);
router.put('/semesters/:id', deanController.updateSemester as any);

// ─── Sections ──────────────────────────────────────────────────────────────────
router.get('/sections', deanController.getSections as any);
router.post('/sections', deanController.createSection as any);
router.put('/sections/:id', deanController.updateSection as any);

// ─── Subjects ──────────────────────────────────────────────────────────────────
router.get('/subjects', deanController.getSubjects as any);
router.post('/subjects', deanController.createSubject as any);
router.put('/subjects/:id', deanController.updateSubject as any);

// ─── HOD Management ────────────────────────────────────────────────────────────
router.get('/hods', deanController.getHods as any);
router.post('/hods', deanController.createHod as any);
router.get('/hods/history', deanController.getHodHistory as any);
router.get('/hods/:id', deanController.getHodById as any);
router.post('/hods/assign', deanController.assignHod as any);
router.delete('/hods/:id', deanController.deleteHod as any);

// ─── Faculty Management & Authorizations ───────────────────────────────────────
router.get('/faculty', deanController.getFacultyList as any);
router.get('/faculty/authorizations', deanController.getFacultyAuthorizations as any);
router.get('/faculty/authorizations/count', deanController.getFacultyAuthorizationCount as any);
router.get('/faculty-authorizations/notification-count', deanController.getFacultyAuthorizationCount as any);
router.get('/faculty/authorizations/:id', deanController.getFacultyAuthorizationById as any);
router.post('/faculty/authorizations/:id/approve', deanController.approveFacultyAuthorization as any);
router.post('/faculty/authorizations/:id/reject', deanController.rejectFacultyAuthorization as any);
router.get('/faculty/assignments', deanController.getFacultyAssignments as any);

export default router;
