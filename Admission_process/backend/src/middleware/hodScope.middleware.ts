import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import HOD from '../models/HOD';
import Department from '../models/Department';
import logger from '../utils/logger.util';

// Extend AuthenticatedRequest with HOD department fields
declare module './auth.middleware' {
  interface AuthenticatedRequest {
    departmentId?: string;
    department?: any;
    hod?: any;
  }
}

/**
 * Strict HOD Department Scope Guard:
 * Resolves the authenticated HOD's active record from the database.
 * Enforces mandatory departmental isolation.
 * Any client-provided `departmentId` parameter is completely ignored.
 */
export const resolveHodDepartmentScope = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Unauthorized. Identity missing.' });
    }

    if (role === 'HOD') {
      const hod = await HOD.findOne({
        where: { userId, isActive: true },
        include: [{ model: Department, as: 'department' }],
      });

      if (!hod || !(hod as any).department) {
        logger.warn(`HOD_SCOPE_DENIED: User ${userId} (${req.user?.email}) has no active department assignment.`);
        return res.status(403).json({
          error: 'Forbidden. No active department assigned to this HOD account.',
        });
      }

      req.hod = hod;
      req.departmentId = hod.departmentId;
      req.department = (hod as any).department;
      return next();
    }

    // For ADMIN and SUPER_ADMIN viewing HOD portal in administrative mode
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const explicitDeptId = (req.query.departmentId as string) || (req.headers['x-department-id'] as string);
      let dept = null;
      if (explicitDeptId) {
        dept = await Department.findByPk(explicitDeptId);
      }
      if (!dept) {
        dept = (await Department.findOne({ where: { code: 'CSE' } })) || (await Department.findOne());
      }

      req.departmentId = dept?.id;
      req.department = dept;
      return next();
    }

    return res.status(403).json({
      error: `Forbidden. Role '${role}' is not authorized to access HOD academic resources.`,
    });
  } catch (error) {
    logger.error('HOD_SCOPE_ERROR: Unexpected error resolving HOD department scope:', error);
    return res.status(500).json({ error: 'Internal Server Error while verifying departmental authorization.' });
  }
};

/**
 * Administrative Scope Guard:
 * Decoupled from strict HOD department lock. Allows administrators to inspect any department.
 */
export const resolveAdminScope = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const targetDeptId = (req.query.departmentId as string) || (req.body?.departmentId as string);
    if (targetDeptId) {
      const dept = await Department.findByPk(targetDeptId);
      if (dept) {
        req.departmentId = dept.id;
        req.department = dept;
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
