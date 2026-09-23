import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import HOD from '../models/HOD';
import Department from '../models/Department';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Section from '../models/Section';
import AcademicYear from '../models/AcademicYear';
import FacultyAuthorizationRequest from '../models/FacultyAuthorizationRequest';
import User from '../models/User';
import logger from '../utils/logger.util';

/**
 * Helper to fetch the active HOD assignment for the authenticated user
 */
export const getActiveHodRecord = async (userId: string) => {
  return await HOD.findOne({
    where: { userId, isActive: true },
    include: [
      { model: Department, as: 'department' },
      { model: User, as: 'user' },
    ],
  });
};

/**
 * GET /api/hod/dashboard
 * Fetches dashboard metadata for the logged-in HOD
 */
export const getHodDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Find active HOD record
    const hod = await getActiveHodRecord(userId);
    if (!hod || !(hod as any).department) {
      // If user is Admin/SuperAdmin viewing HOD module
      if (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN') {
        const firstDept = await Department.findOne();
        return res.json({
          success: true,
          data: {
            hod: {
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin HOD Mode',
              email: user.email,
              role: user.role,
            },
            department: firstDept ? {
              id: firstDept.id,
              name: firstDept.name,
              code: firstDept.code,
            } : null,
            academicYear: '2026-27',
            stats: {
              facultyCount: 0,
              subjectsCount: 0,
              sectionsCount: 0,
              pendingAuthorizations: 0,
            },
            activities: [],
          },
        });
      }

      return res.status(404).json({ error: 'No active department assigned to this HOD account.' });
    }

    const departmentId = hod.departmentId;
    const currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true } });
    const currentAcademicYear = currentYearRecord?.year || '2026-27';

    // Department-scoped counts
    const [facultyCount, subjectsCount, sectionsCount, pendingAuthorizations] = await Promise.all([
      Teacher.count({ where: { departmentId } }),
      Subject.count({ where: { departmentId } }),
      Section.count({ where: { departmentId, academicYear: currentAcademicYear } }),
      FacultyAuthorizationRequest.count({ where: { departmentId, status: 'PENDING' } }),
    ]);

    return res.json({
      success: true,
      data: {
        hod: {
          id: hod.id,
          userId: hod.userId,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          tenureStartDate: hod.tenureStartDate,
        },
        department: {
          id: (hod as any).department.id,
          name: (hod as any).department.name,
          code: (hod as any).department.code,
        },
        academicYear: currentAcademicYear,
        stats: {
          facultyCount,
          subjectsCount,
          sectionsCount,
          pendingAuthorizations,
        },
        // Clean empty state for upcoming academic activities
        activities: [],
      },
    });
  } catch (error) {
    logger.error('HOD_DASHBOARD_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/hod/department
 * Fetches department information strictly scoped to the logged-in HOD
 */
export const getHodDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const hod = await getActiveHodRecord(userId);
    if (!hod) {
      return res.status(404).json({ error: 'Assigned department not found.' });
    }

    const department = await Department.findByPk(hod.departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department record not found.' });
    }

    // Faculty members in this department
    const teachers = await Teacher.findAll({
      where: { departmentId: hod.departmentId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status'],
        },
      ],
    });

    // Subjects in this department
    const subjects = await Subject.findAll({
      where: { departmentId: hod.departmentId },
      order: [['semester', 'ASC'], ['code', 'ASC']],
    });

    return res.json({
      success: true,
      data: {
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
        },
        facultyList: teachers.map((t: any) => ({
          id: t.id,
          userId: t.userId,
          name: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim(),
          email: t.user?.email,
          phone: t.user?.phone,
          designation: t.designation,
          joiningDate: t.joiningDate,
          status: t.user?.status || 'ACTIVE',
        })),
        subjectsList: subjects,
      },
    });
  } catch (error) {
    logger.error('HOD_DEPARTMENT_ERROR:', error);
    return next(error);
  }
};
