import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { resolveHodDepartmentScope } from '../middleware/hodScope.middleware';
import { requireActiveMentorAccess } from '../middleware/mentorAccess.middleware';
import * as mentorController from '../controllers/mentor.controller';

// ─── HOD Mentor Routes ────────────────────────────────────────────────────────
export const hodMentorRouter = express.Router();

hodMentorRouter.use(authMiddleware as any);
hodMentorRouter.use(authorizeRoles('HOD', 'ADMIN', 'SUPER_ADMIN', 'DEAN', 'PRINCIPAL') as any);
hodMentorRouter.use(resolveHodDepartmentScope as any);

// HOD Overview & Analytics
hodMentorRouter.get('/overview', mentorController.getHodMentorOverview as any);

// HOD Student Selection & Filters
hodMentorRouter.get('/students', mentorController.getEligibleStudents as any);

// HOD Mentor Core Departments List
hodMentorRouter.get('/departments', mentorController.getMentorCoreDepartments as any);

// HOD Active Eligible Faculty for selected core department
hodMentorRouter.get('/faculty/:departmentId', mentorController.getEligibleFaculty as any);

// HOD Bulk Allocation & Reassignment
hodMentorRouter.post('/assign', mentorController.bulkAssignMentors as any);
hodMentorRouter.post('/reassign', mentorController.reassignMentor as any);

// HOD View Allocations & Student History
hodMentorRouter.get('/allocations', mentorController.getAllocations as any);
hodMentorRouter.get('/history/:studentId', mentorController.getStudentAllocationHistory as any);


// ─── Faculty Mentor Dashboard Routes ──────────────────────────────────────────
export const facultyMentorRouter = express.Router();

facultyMentorRouter.use(authMiddleware as any);
facultyMentorRouter.use(authorizeRoles('FACULTY', 'TEACHER', 'HOD', 'DEAN', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN') as any);

// Status check (Accessible to all authenticated faculty to determine capability)
facultyMentorRouter.get('/status', mentorController.getMentorStatus as any);

// Protected routes requiring ACTIVE mentor assignment (or Admin/Dean role)
facultyMentorRouter.use(requireActiveMentorAccess as any);

// Faculty Dashboard Overview
facultyMentorRouter.get('/overview', mentorController.getMentorDashboardOverview as any);

// My Mentees List
facultyMentorRouter.get('/mentees', mentorController.getMyMentees as any);

// Individual Mentee Profile
facultyMentorRouter.get('/mentees/:studentId', mentorController.getMenteeProfile as any);
facultyMentorRouter.get('/mentees/:studentId/academics', mentorController.getMenteeAcademics as any);
facultyMentorRouter.get('/mentees/:studentId/attendance', mentorController.getMenteeAttendance as any);
facultyMentorRouter.get('/mentees/:studentId/records', mentorController.getMenteeRecords as any);

// Mentoring Session Records & Follow-up Actions
facultyMentorRouter.post('/records', mentorController.createMentoringRecord as any);
facultyMentorRouter.patch('/records/:recordId/status', mentorController.updateFollowUpStatus as any);

export default {
  hodMentorRouter,
  facultyMentorRouter,
};
