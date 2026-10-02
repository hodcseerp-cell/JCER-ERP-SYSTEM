import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import facultyService from '../services/faculty.service';
import logger from '../utils/logger.util';

/**
 * GET /api/faculty/dashboard
 * Retrieves summary statistics and assigned courses for the logged-in faculty
 */
export const getFacultyDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const academicYear = req.query.academicYear as string;
    const dashboard = await facultyService.getFacultyDashboard(userId, academicYear);
    return res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_DASHBOARD_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/faculty/assignments
 * Retrieves all active teaching assignments for the logged-in faculty
 */
export const getFacultyAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const academicYear = req.query.academicYear as string;
    const assignments = await facultyService.getFacultyAssignments(userId, academicYear);
    return res.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_ASSIGNMENTS_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/faculty/attendance
 * Retrieves attendance-authorized assignments with real calculations
 */
export const getFacultyAttendanceList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const semester = req.query.semester as string;
    const academicYear = req.query.academicYear as string;
    const courses = await facultyService.getFacultyAttendanceList(userId, semester, academicYear);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_ATTENDANCE_LIST_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/faculty/attendance/:assignmentId
 * Retrieves detailed attendance workspace for a single authorized assignment
 */
export const getFacultyAttendanceWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const workspace = await facultyService.getFacultyAttendanceWorkspace(userId, assignmentId);
    return res.json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_ATTENDANCE_WORKSPACE_ERROR:', error);
    return res.status(403).json({ error: error.message || 'Unauthorized attendance access.' });
  }
};

/**
 * GET /api/faculty/bitwise-marks
 * Retrieves continuous assessment / marks authorized assignments
 */
export const getFacultyMarksList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const semester = req.query.semester as string;
    const academicYear = req.query.academicYear as string;
    const courses = await facultyService.getFacultyMarksList(userId, semester, academicYear);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_MARKS_LIST_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/faculty/bitwise-marks/:assignmentId
 * Retrieves detailed continuous assessment / marks workspace
 */
export const getFacultyMarksWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const workspace = await facultyService.getFacultyMarksWorkspace(userId, assignmentId);
    return res.json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_MARKS_WORKSPACE_ERROR:', error);
    return res.status(403).json({ error: error.message || 'Unauthorized marks access.' });
  }
};

/**
 * GET /api/faculty/analytics
 * Retrieves assignment-scoped analytics for the authenticated faculty
 */
export const getFacultyAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const academicYear = req.query.academicYear as string;
    const analytics = await facultyService.getFacultyAnalytics(userId, academicYear);
    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_ANALYTICS_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/faculty/attendance/:assignmentId
 * Records or updates attendance session for assigned cohort
 */
export const saveFacultyAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const { date, sessionPeriod, records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid attendance records array.' });
    }

    const updatedWorkspace = await facultyService.saveFacultyAttendance(userId, assignmentId, {
      date,
      sessionPeriod,
      records,
    });

    return res.json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: updatedWorkspace,
    });
  } catch (error: any) {
    logger.error('SAVE_FACULTY_ATTENDANCE_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to record attendance.' });
  }
};

/**
 * POST /api/faculty/bitwise-marks/:assignmentId
 * Saves student continuous assessment marks
 */
export const saveFacultyMarks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const { marks } = req.body;
    if (!Array.isArray(marks)) {
      return res.status(400).json({ error: 'Invalid marks array.' });
    }

    const updatedWorkspace = await facultyService.saveFacultyMarks(userId, assignmentId, {
      marks,
    });

    return res.json({
      success: true,
      message: 'Assessment marks saved successfully.',
      data: updatedWorkspace,
    });
  } catch (error: any) {
    logger.error('SAVE_FACULTY_MARKS_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to save marks.' });
  }
};

