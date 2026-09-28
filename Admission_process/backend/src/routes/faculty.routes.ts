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
router.get('/google-connection', ...facultyAuthGuard, facultyController.getFacultyGoogleConnection as any);

// ── Faculty Attendance Workspace ─────────────────────────────────────────────
router.get('/attendance', ...facultyAuthGuard, facultyController.getFacultyAttendanceList as any);
router.get('/attendance/:assignmentId', ...facultyAuthGuard, facultyController.getFacultyAttendanceWorkspace as any);
router.get('/attendance/:assignmentId/sheet-view', ...facultyAuthGuard, facultyController.getFacultyAttendanceSheetView as any);
router.patch('/attendance/:assignmentId/sheet-cells', ...facultyAuthGuard, facultyController.updateFacultyAttendanceSheetCells as any);
router.post('/attendance/:assignmentId/sync', ...facultyAuthGuard, facultyController.syncFacultyAttendance as any);

// ── Faculty Bitwise Marks Workspace ──────────────────────────────────────────
router.get('/bitwise-marks', ...facultyAuthGuard, facultyController.getFacultyMarksList as any);
router.get('/bitwise-marks/:assignmentId', ...facultyAuthGuard, facultyController.getFacultyMarksWorkspace as any);
router.get('/bitwise-marks/:assignmentId/sheet-view', ...facultyAuthGuard, facultyController.getFacultyMarksSheetView as any);
router.post('/bitwise-marks/:assignmentId/sync', ...facultyAuthGuard, facultyController.syncFacultyMarks as any);

// ── Faculty Analytics ────────────────────────────────────────────────────────
router.get('/analytics', ...facultyAuthGuard, facultyController.getFacultyAnalytics as any);

export default router;
