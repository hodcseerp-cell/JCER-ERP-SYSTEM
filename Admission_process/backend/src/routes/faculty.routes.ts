import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import * as facultyController from '../controllers/faculty.controller';

const router = express.Router();

// Base middleware for all faculty routes
const facultyAuthGuard = [
  authMiddleware as any,
  authorizeRoles('TEACHER', 'FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN') as any,
];

// ── Faculty Dashboard & Overview ─────────────────────────────────────────────
router.get('/dashboard', ...facultyAuthGuard, facultyController.getFacultyDashboard as any);
router.get('/assignments', ...facultyAuthGuard, facultyController.getFacultyAssignments as any);

// ── Faculty Attendance Workspace ─────────────────────────────────────────────
router.get('/attendance', ...facultyAuthGuard, facultyController.getFacultyAttendanceList as any);
router.get('/attendance/:assignmentId', ...facultyAuthGuard, facultyController.getFacultyAttendanceWorkspace as any);
router.post('/attendance/:assignmentId', ...facultyAuthGuard, facultyController.saveFacultyAttendance as any);

// ── Faculty Bitwise Marks Workspace ──────────────────────────────────────────
router.get('/bitwise-marks', ...facultyAuthGuard, facultyController.getFacultyMarksList as any);
router.get('/bitwise-marks/:assignmentId', ...facultyAuthGuard, facultyController.getFacultyMarksWorkspace as any);
router.post('/bitwise-marks/:assignmentId', ...facultyAuthGuard, facultyController.saveFacultyMarks as any);

// ── Faculty Analytics ────────────────────────────────────────────────────────
router.get('/analytics', ...facultyAuthGuard, facultyController.getFacultyAnalytics as any);

export default router;
