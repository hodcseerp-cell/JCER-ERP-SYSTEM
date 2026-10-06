import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import MentorAssignment from '../models/MentorAssignment';
import { normalizeAcademicYear } from '../utils/academicYear.util';
import { Op } from 'sequelize';
import logger from '../utils/logger.util';

/**
 * Enforces that the current authenticated user has an ACTIVE mentor assignment
 * for the requested academic year (or generally if no AY is specified).
 * Admins, Super Admins, Deans, and Principals bypass this check.
 */
export const requireActiveMentorAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Authentication required.' });
    }

    const { id: userId, role } = req.user;

    // Administrative roles have system-level bypass
    if (['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'DEAN'].includes(role)) {
      return next();
    }

    const academicYear = (req.query.academicYear as string) || (req.headers['x-academic-year'] as string);
    const whereClause: any = {
      facultyId: userId,
      status: 'ACTIVE',
    };

    if (academicYear) {
      const normalizedAY = normalizeAcademicYear(academicYear);
      whereClause[Op.or] = [
        { academicYear },
        { academicYear: normalizedAY },
        { academicYear: academicYear.replace('-20', '-') },
      ];
    }

    const activeAssignmentsCount = await MentorAssignment.count({ where: whereClause });

    if (activeAssignmentsCount === 0) {
      logger.warn(`MENTOR_ACCESS_DENIED: User ${userId} (${role}) attempted to access mentor route without active mentor assignment (AY: ${academicYear || 'ANY'})`);
      return res.status(403).json({
        success: false,
        error: 'Access Forbidden. You are not assigned as an active mentor for this scope.',
        code: 'NOT_A_MENTOR',
      });
    }

    return next();
  } catch (error: any) {
    logger.error('Error verifying mentor access:', error);
    return res.status(500).json({ success: false, error: 'Internal server error while verifying mentor access.' });
  }
};

export default requireActiveMentorAccess;
