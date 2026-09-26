import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { resolveHodDepartmentScope } from '../middleware/hodScope.middleware';
import * as hodController from '../controllers/hod.controller';
import * as googleSheetsController from '../controllers/googleSheets.controller';

const router = express.Router();

// ─── Base Security Pipeline ──────────────────────────────────────────────────
// 1. Authenticate JWT session
router.use(authMiddleware as any);
// 2. Authorize HOD / Admin roles
router.use(authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN') as any);
// 3. Resolve and enforce strict departmental scope
router.use(resolveHodDepartmentScope as any);

// ─── 1. Dashboard & Overview ─────────────────────────────────────────────────
router.get('/dashboard', hodController.getHodDashboard as any);
router.get('/department', hodController.getHodDepartment as any);

// ─── 2. Students Module ──────────────────────────────────────────────────────
router.get('/students', hodController.getHodStudents as any);
router.get('/students/semesters', hodController.getHodStudentSemesters as any);
router.get('/students/sections', hodController.getHodStudentSections as any);
router.get('/students/:id', hodController.getHodStudentById as any);

// ─── 3. Faculty Management & Authorization Module ────────────────────────────
router.get('/faculty', hodController.getHodFacultyList as any);
router.post('/faculty', hodController.createFacultyWithAuthorization as any);
router.get('/faculty/assignments', hodController.getHodFacultyAssignments as any);
router.get('/faculty/:id', hodController.getHodFacultyDetail as any);
router.put('/faculty/:id/assignment', hodController.updateFacultyAssignment as any);
router.patch('/faculty/:id/access', hodController.toggleFacultyAccess as any);
router.post('/faculty/:id/reset-password', hodController.resetFacultyPassword as any);
router.patch('/faculty/:id/status', hodController.toggleFacultyStatus as any);

// Faculty Google Sheet Access
router.get('/faculty/google-sheet-access', googleSheetsController.getFacultyGoogleSheetAccessMatrix as any);
router.post('/faculty/:facultyId/google-sheet-access', googleSheetsController.grantFacultyGoogleSheetAccess as any);
router.post('/faculty/:facultyId/google-sheet-access/verify', googleSheetsController.verifyFacultyGoogleSheetAccess as any);
router.post('/faculty/:facultyId/google-sheet-access/revoke', googleSheetsController.revokeFacultyGoogleSheetAccess as any);

// ─── 4. Subjects Module ──────────────────────────────────────────────────────
router.get('/subjects', hodController.getHodSubjects as any);
router.post('/subjects', hodController.createHodSubject as any);
router.put('/subjects/:id', hodController.updateHodSubject as any);
router.delete('/subjects/:id', hodController.deleteHodSubject as any);
router.post('/subjects/assign', hodController.assignHodSubject as any);

// ─── 5. Attendance Module ────────────────────────────────────────────────────
router.get('/attendance/overview', hodController.getHodAttendanceOverview as any);
router.get('/attendance/defaulters', hodController.getHodAttendanceDefaulters as any);
router.get('/attendance/sessions', hodController.getHodAttendanceSessions as any);

// ─── 6. Academics Module ─────────────────────────────────────────────────────
router.get('/academics/overview', hodController.getHodAcademicsOverview as any);
router.get('/academics/bitwise', hodController.getHodBitwiseAnalysis as any);
router.get('/academics/performance', hodController.getHodStudentPerformance as any);

// ─── 7. Google Sheets Layer ──────────────────────────────────────────────────
router.get('/semesters/:semesterId/google-sheets', googleSheetsController.getSemesterGoogleSheets as any);
router.post('/semesters/:semesterId/google-sheets/connect', googleSheetsController.connectSemesterGoogleSheet as any);
router.get('/semesters/:semesterId/google-sheets/tabs', googleSheetsController.getSemesterGoogleSheetTabs as any);
router.post('/google-sheets/:connectionId/map-tab', googleSheetsController.mapGoogleSheetTab as any);
router.post('/google-sheets/:connectionId/refresh', googleSheetsController.refreshGoogleSheet as any);
router.post('/google-sheets/:connectionId/disconnect', googleSheetsController.disconnectGoogleSheet as any);

// Legacy/matrix endpoints preserved
router.get('/sheets/access', hodController.getHodSheetAccessMatrix as any);
router.patch('/sheets/access/:assignmentId', hodController.updateHodSheetAccess as any);
router.get('/sheets/sync-history', hodController.getHodSheetSyncHistory as any);

// ─── 8. Reports & Settings Module ────────────────────────────────────────────
router.get('/reports', hodController.getHodReports as any);
router.get('/settings', hodController.getHodSettings as any);
router.put('/settings/profile', hodController.updateHodProfile as any);
router.put('/settings/password', hodController.updateHodPassword as any);

export default router;

