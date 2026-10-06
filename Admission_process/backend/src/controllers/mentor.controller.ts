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
    const { search, admissionBatch, semester, section, attendanceStatus, sortBy, sortOrder, academicYear } = req.query;

    const data = await MentorService.getMyMentees(facultyId, {
      search: search as string,
      admissionBatch: admissionBatch as string,
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

export const getPendingTransitions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const { admissionBatch, search, page, limit } = req.query;
    const data = await MentorService.getPendingTransitions(context, {
      admissionBatch: admissionBatch as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const resolveTransitions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const context = getHodContext(req);
    const data = await MentorService.resolveTransitions(context, req.body);
    return res.json({
      success: true,
      message: `Successfully resolved ${data.resolvedCount} mentor transition(s).`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMentorCohorts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const data = await MentorService.getMentorCohorts(facultyId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMenteeAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId } = req.params;
    const facultyId = req.user?.id!;
    const data = await MentorService.getMenteeAnalytics(studentId, facultyId, req.user?.role);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getGlobalMentorAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const data = await MentorService.getGlobalMentorAnalytics(facultyId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const parseParentImport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Please upload an Excel file.' });
    }
    const data = await MentorService.parseAndValidateParentImport(facultyId, req.file.buffer);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const confirmParentImport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const { rows } = req.body;
    const data = await MentorService.confirmParentImport(facultyId, rows);
    return res.json({
      success: true,
      message: `Successfully updated parent information for ${data.updatedCount} student(s).`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const searchMentees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const facultyId = req.user?.id!;
    const query = (req.query.q as string) || (req.query.search as string) || '';
    const data = await MentorService.searchMentees(facultyId, query);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
