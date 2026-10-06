import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import MentorService, { HodScopeContext } from '../services/mentor.service';
import logger from '../utils/logger.util';

/**
 * Extract HOD Scope Context from AuthenticatedRequest
 */
const getHodContext = (req: AuthenticatedRequest): HodScopeContext => {
  return {
    userId: req.user?.id!,
    departmentId: req.departmentId!,
    department: req.department,
    isSemesterHandling: Boolean(req.isSemesterHandling),
    handlingSemesters: req.handlingSemesters || null,
    role: req.user?.role,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// ─── HOD CONTROLLER METHODS ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export const getHodMentorOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const academicYear = (req.query.academicYear as string) || '2026-27';
    const data = await MentorService.getHodMentorOverview(context, academicYear);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEligibleStudents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const { academicYear, semester, section, search, status, page, limit } = req.query;

    const data = await MentorService.getEligibleStudents(context, {
      academicYear: academicYear as string,
      semester: semester ? Number(semester) : undefined,
      section: section as string,
      search: search as string,
      status: status as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMentorCoreDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const data = await MentorService.getMentorCoreDepartments();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEligibleFaculty = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { departmentId } = req.params;
    const { search, academicYear } = req.query;
    const data = await MentorService.getEligibleFaculty(
      departmentId,
      search as string,
      (academicYear as string) || '2026-27'
    );
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const bulkAssignMentors = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const data = await MentorService.bulkAssignMentors(context, req.body);
    return res.status(201).json({
      success: true,
      message: `Successfully allocated mentors for ${data.totalProcessed} student(s).`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const { academicYear, semester, section, mentorDepartmentId, facultyId, search, status, page, limit } = req.query;

    const data = await MentorService.getAllocations(context, {
      academicYear: academicYear as string,
      semester: semester ? Number(semester) : undefined,
      section: section as string,
      mentorDepartmentId: mentorDepartmentId as string,
      facultyId: facultyId as string,
      search: search as string,
      status: status as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const reassignMentor = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const data = await MentorService.reassignMentor(context, req.body);
    return res.json({
      success: true,
      message: 'Student mentor reassigned successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAllocationHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const data = await MentorService.getStudentAllocationHistory(studentId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ─── FACULTY MENTOR CONTROLLER METHODS ───────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export const getMentorStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const academicYear = req.query.academicYear as string | undefined;
    const data = await MentorService.getMentorStatus(facultyId, academicYear);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMentorDashboardOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const academicYear = (req.query.academicYear as string) || '2026-27';
    const data = await MentorService.getMentorDashboardOverview(facultyId, academicYear);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMyMentees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const { search, semester, section, attendanceStatus, sortBy, sortOrder, academicYear } = req.query;

    const data = await MentorService.getMyMentees(facultyId, {
      search: search as string,
      semester: semester ? Number(semester) : undefined,
      section: section as string,
      attendanceStatus: attendanceStatus as any,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      academicYear: academicYear as string,
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMenteeProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const facultyId = req.user?.id!;
    const data = await MentorService.getMenteeProfile(studentId, facultyId, req.user?.role);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMenteeAcademics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const facultyId = req.user?.id!;
    const data = await MentorService.getMenteeAcademicPerformance(studentId, facultyId, req.user?.role);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMenteeAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { semester } = req.query;
    const facultyId = req.user?.id!;
    const data = await MentorService.getMenteeAttendanceDetails(
      studentId,
      facultyId,
      semester ? Number(semester) : undefined,
      req.user?.role
    );
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMenteeRecords = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const facultyId = req.user?.id!;
    const data = await MentorService.getMentoringRecords(studentId, facultyId, req.user?.role);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createMentoringRecord = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const data = await MentorService.createMentoringRecord(facultyId, req.body, req.user?.role);
    return res.status(201).json({
      success: true,
      message: 'Mentoring session record created successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFollowUpStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { recordId } = req.params;
    const facultyId = req.user?.id!;
    const data = await MentorService.updateFollowUpStatus(facultyId, recordId, req.body, req.user?.role);
    return res.json({
      success: true,
      message: 'Follow-up status updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
