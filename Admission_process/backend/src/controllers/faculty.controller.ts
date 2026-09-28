import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import facultyService from '../services/faculty.service';
import AuditLog from '../models/AuditLog';
import logger from '../utils/logger.util';

/**
 * Helper to record structured audit logs
 */
async function recordAudit(req: AuthenticatedRequest, action: string, details: any) {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      action,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      details: {
        role: req.user?.role || null,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  } catch (err: any) {
    logger.warn('Failed to write audit log:', err.message);
  }
}

/**
 * GET /api/faculty/dashboard
 * Retrieves summary statistics, Google connection status, and assigned courses for the logged-in faculty
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

    const dashboard = await facultyService.getFacultyDashboard(userId);
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

    const assignments = await facultyService.getFacultyAssignments(userId);
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
 * GET /api/faculty/google-connection
 * Retrieves Google OAuth connection status for the logged-in faculty
 */
export const getFacultyGoogleConnection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    const status = await facultyService.getFacultyGoogleOAuthStatus(userId);
    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_GOOGLE_CONNECTION_ERROR:', error);
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
    const courses = await facultyService.getFacultyAttendanceList(userId, semester);

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
 * POST /api/faculty/attendance/:assignmentId/sync
 * Synchronizes attendance from the authorized Google Sheet tab into ERP database
 */
export const syncFacultyAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;
    const { overrideValues } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const result = await facultyService.syncFacultyAttendance(userId, assignmentId, overrideValues);

    await recordAudit(req, 'FACULTY_ATTENDANCE_SYNC', {
      assignmentId,
      status: result.status,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      rejected: result.recordsRejected,
    });

    return res.json({
      success: result.status !== 'FAILED',
      message:
        result.status === 'SUCCESS'
          ? 'Attendance synchronized successfully from Google Sheet.'
          : result.status === 'PARTIAL'
          ? `Sync completed with ${result.errorCount} rejected row(s).`
          : 'Attendance sync failed.',
      data: result,
    });
  } catch (error: any) {
    logger.error('SYNC_FACULTY_ATTENDANCE_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to synchronize attendance.' });
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
    const courses = await facultyService.getFacultyMarksList(userId, semester);

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
 * POST /api/faculty/bitwise-marks/:assignmentId/sync
 * Synchronizes marks from the authorized Google Sheet tab into ERP database
 */
export const syncFacultyMarks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;
    const { assessmentName, overrideValues } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const result = await facultyService.syncFacultyMarks(
      userId,
      assignmentId,
      assessmentName,
      overrideValues
    );

    await recordAudit(req, 'FACULTY_MARKS_SYNC', {
      assignmentId,
      status: result.status,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      rejected: result.recordsRejected,
    });

    return res.json({
      success: result.status !== 'FAILED',
      message:
        result.status === 'SUCCESS'
          ? 'Marks synchronized successfully from Google Sheet.'
          : result.status === 'PARTIAL'
          ? `Sync completed with ${result.errorCount} rejected row(s).`
          : 'Marks sync failed.',
      data: result,
    });
  } catch (error: any) {
    logger.error('SYNC_FACULTY_MARKS_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to synchronize marks.' });
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

    const analytics = await facultyService.getFacultyAnalytics(userId);
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
 * GET /api/faculty/attendance/:assignmentId/sheet-view
 * Retrieves authorized Google Sheet view data for attendance
 */
export const getFacultyAttendanceSheetView = async (
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

    const sheetView = await facultyService.getFacultyAttendanceSheetView(userId, assignmentId);
    return res.json({
      success: true,
      data: sheetView,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_ATTENDANCE_SHEET_VIEW_ERROR:', error);
    return res.status(403).json({ error: error.message || 'Unauthorized attendance sheet access.' });
  }
};

/**
 * GET /api/faculty/bitwise-marks/:assignmentId/sheet-view
 * Retrieves authorized Google Sheet view data for continuous assessment marks
 */
export const getFacultyMarksSheetView = async (
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

    const sheetView = await facultyService.getFacultyMarksSheetView(userId, assignmentId);
    return res.json({
      success: true,
      data: sheetView,
    });
  } catch (error: any) {
    logger.error('GET_FACULTY_MARKS_SHEET_VIEW_ERROR:', error);
    return res.status(403).json({ error: error.message || 'Unauthorized marks sheet access.' });
  }
};

/**
 * PATCH /api/faculty/attendance/:assignmentId/sheet-cells
 * Updates specific attendance cell values in the real Google Sheet via Google Sheets API
 */
export const updateFacultyAttendanceSheetCells = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const assignmentId = req.params.assignmentId;
    const { updates } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Session missing.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array cannot be empty.' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'JCER-ERP-Faculty';

    const result = await facultyService.updateFacultyAttendanceSheetCells(
      userId,
      assignmentId,
      updates,
      clientIp,
      userAgent
    );

    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('UPDATE_FACULTY_ATTENDANCE_SHEET_CELLS_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to update Google Sheet cells.' });
  }
};

