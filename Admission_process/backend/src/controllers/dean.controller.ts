import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Department from '../models/Department';
import Subject from '../models/Subject';
import Teacher from '../models/Teacher';
import HOD from '../models/HOD';
import Student from '../models/Student';
import AuditLog from '../models/AuditLog';
import AcademicYear from '../models/AcademicYear';
import Semester from '../models/Semester';
import Section from '../models/Section';
import HODAssignmentHistory from '../models/HODAssignmentHistory';
import FacultyAuthorizationRequest from '../models/FacultyAuthorizationRequest';
import FacultyAssignment from '../models/FacultyAssignment';
import SystemConfiguration from '../models/SystemConfiguration';
import logger from '../utils/logger.util';

// Helper to record audit log
const logAudit = async (req: AuthenticatedRequest, action: string, details: any) => {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      action,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'System',
      details,
    });
  } catch (err) {
    logger.warn('Failed to write audit log in dean.controller:', err);
  }
};

// ─── 1. Dashboard Overview ─────────────────────────────────────────────────────

export const getDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    let currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true } });
    if (!currentYearRecord) {
      currentYearRecord = await AcademicYear.findOne({ where: { status: 'ACTIVE' } });
    }
    if (!currentYearRecord) {
      const sysConfig = await SystemConfiguration.findOne();
      if (sysConfig?.admissionCycle) {
        currentYearRecord = await AcademicYear.findOne({ where: { year: sysConfig.admissionCycle } });
      }
    }
    if (!currentYearRecord) {
      currentYearRecord = await AcademicYear.findOne({ order: [['startDate', 'DESC']] });
    }
    const currentYear = currentYearRecord?.year || '2026-27';

    // Counts
    const departmentsCount = await Department.count();
    const activeHodsCount = await HOD.count({ where: { isActive: true } });
    const totalFacultyCount = await Teacher.count();
    const pendingRequestsCount = await FacultyAuthorizationRequest.count({
      where: {
        status: 'PENDING',
        authority: 'DEAN',
      },
    });

    // Department Overview list
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });

    const departmentOverview = await Promise.all(
      departments.map(async (dept) => {
        const hodRecord = await HOD.findOne({
          where: { departmentId: dept.id, isActive: true },
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'profileImage'] }],
        });

        const facultyCount = await Teacher.count({ where: { departmentId: dept.id } });
        const studentCount = await Student.count({ where: { departmentId: dept.id } });

        const hodUser = (hodRecord as any)?.user;
        const hodName = hodUser ? `${hodUser.firstName} ${hodUser.lastName}`.trim() : 'Unassigned';

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          hodName,
          hodEmail: hodUser?.email || null,
          hodImage: hodUser?.profileImage || null,
          facultyCount,
          studentCount,
          status: 'Active',
        };
      })
    );

    // Latest Pending Faculty Requests
    const pendingRequests = await FacultyAuthorizationRequest.findAll({
      where: {
        status: 'PENDING',
        authority: 'DEAN',
      },
      include: [
        { model: User, as: 'faculty', attributes: ['firstName', 'lastName', 'email', 'phone', 'profileImage'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['name', 'code'] },
        { model: User, as: 'createdByHOD', attributes: ['firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 6,
    });

    const formattedPendingRequests = pendingRequests.map((reqItem: any) => ({
      id: reqItem.id,
      facultyName: `${reqItem.faculty?.firstName || ''} ${reqItem.faculty?.lastName || ''}`.trim() || 'Faculty Member',
      email: reqItem.faculty?.email,
      department: reqItem.department?.name || 'Department',
      departmentCode: reqItem.department?.code || 'N/A',
      subject: reqItem.subject?.name || 'Not Specified',
      subjectCode: reqItem.subject?.code || 'N/A',
      semester: reqItem.semester,
      section: reqItem.section,
      academicYear: reqItem.academicYear,
      designation: reqItem.designation,
      createdBy: reqItem.createdByHOD ? `HOD - ${reqItem.createdByHOD.firstName} ${reqItem.createdByHOD.lastName}` : 'HOD',
      requestedDate: reqItem.createdAt,
      status: reqItem.status,
    }));

    return res.json({
      success: true,
      data: {
        academicYear: currentYear,
        stats: {
          departments: departmentsCount,
          activeHods: activeHodsCount,
          totalFaculty: totalFacultyCount,
          pendingRequests: pendingRequestsCount,
        },
        departmentOverview,
        pendingRequests: formattedPendingRequests,
      },
    });
  } catch (error) {
    logger.error('Error fetching Dean dashboard data:', error);
    return next(error);
  }
};

// ─── 2. Academic Years ─────────────────────────────────────────────────────────

export const getAcademicYears = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, status } = req.query;
    const where: any = {};

    if (search) {
      where.year = { [Op.iLike]: `%${search}%` };
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const years = await AcademicYear.findAll({
      where,
      order: [['startDate', 'DESC']],
    });

    return res.json({ success: true, data: years });
  } catch (error) {
    return next(error);
  }
};

export const createAcademicYear = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { year, startDate, endDate, status, isCurrent } = req.body;

    if (!year || !startDate || !endDate) {
      await t.rollback();
      return res.status(400).json({ error: 'Academic Year, Start Date, and End Date are required.' });
    }

    const existing = await AcademicYear.findOne({ where: { year } });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: `Academic Year ${year} already exists.` });
    }

    const shouldBeCurrent = isCurrent === true || status === 'ACTIVE';

    if (shouldBeCurrent) {
      // Set all others to isCurrent = false
      await AcademicYear.update({ isCurrent: false }, { where: {}, transaction: t });
    }

    const created = await AcademicYear.create(
      {
        year,
        startDate,
        endDate,
        status: shouldBeCurrent ? 'ACTIVE' : (status || 'UPCOMING'),
        isCurrent: shouldBeCurrent,
      },
      { transaction: t }
    );

    if (shouldBeCurrent) {
      const sysConfig = await SystemConfiguration.findOne({ transaction: t });
      if (sysConfig) {
        await sysConfig.update({ admissionCycle: year }, { transaction: t });
      }
    }

    await t.commit();
    await logAudit(req, 'CREATE_ACADEMIC_YEAR', { academicYearId: created.id, year });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

export const updateAcademicYear = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { startDate, endDate, status, isCurrent } = req.body;

    const academicYear = await AcademicYear.findByPk(id);
    if (!academicYear) {
      await t.rollback();
      return res.status(404).json({ error: 'Academic Year not found.' });
    }

    // Determine if this update makes this academic year the current active session
    const shouldBeCurrent = isCurrent === true || (isCurrent !== false && status === 'ACTIVE');

    if (shouldBeCurrent) {
      // Unset all other academic years as current
      await AcademicYear.update(
        { isCurrent: false },
        { where: { id: { [Op.ne]: id } }, transaction: t }
      );

      // Keep SystemConfiguration.admissionCycle in sync for college-wide consistency
      const sysConfig = await SystemConfiguration.findOne({ transaction: t });
      if (sysConfig) {
        await sysConfig.update({ admissionCycle: academicYear.year }, { transaction: t });
      }
    }

    await academicYear.update(
      {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status: shouldBeCurrent ? 'ACTIVE' : status }),
        isCurrent: shouldBeCurrent ? true : (isCurrent !== undefined ? Boolean(isCurrent) : academicYear.isCurrent),
      },
      { transaction: t }
    );

    await t.commit();
    await logAudit(req, 'UPDATE_ACADEMIC_YEAR', { academicYearId: id, year: academicYear.year, changes: req.body });
    return res.json({ success: true, data: academicYear });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// ─── 3. Departments ────────────────────────────────────────────────────────────

export const getDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const departments = await Department.findAll({
      where,
      order: [['name', 'ASC']],
    });

    const result = await Promise.all(
      departments.map(async (dept) => {
        const hod = await HOD.findOne({
          where: { departmentId: dept.id, isActive: true },
          include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'] }],
        });

        const facultyCount = await Teacher.count({ where: { departmentId: dept.id } });
        const studentCount = await Student.count({ where: { departmentId: dept.id } });
        const subjectCount = await Subject.count({ where: { departmentId: dept.id } });

        const hodUser = (hod as any)?.user;

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          hod: hodUser ? {
            id: hodUser.id,
            name: `${hodUser.firstName} ${hodUser.lastName}`.trim(),
            email: hodUser.email,
            profileImage: hodUser.profileImage,
          } : null,
          facultyCount,
          studentCount,
          subjectCount,
          status: 'Active',
          createdAt: dept.createdAt,
        };
      })
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Department Name and Department Code are required.' });
    }

    const existing = await Department.findOne({
      where: {
        [Op.or]: [{ name }, { code }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'A department with this name or code already exists.' });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    });

    await logAudit(req, 'CREATE_DEPARTMENT', { departmentId: dept.id, name: dept.name, code: dept.code });
    return res.status(201).json({ success: true, data: dept });
  } catch (error) {
    return next(error);
  }
};

export const updateDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    if (name || code) {
      const conflict = await Department.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            ...(name ? [{ name: name.trim() }] : []),
            ...(code ? [{ code: code.trim().toUpperCase() }] : []),
          ],
        },
      });

      if (conflict) {
        return res.status(400).json({ error: 'Another department already uses this name or code.' });
      }
    }

    await dept.update({
      ...(name && { name: name.trim() }),
      ...(code && { code: code.trim().toUpperCase() }),
    });

    await logAudit(req, 'UPDATE_DEPARTMENT', { departmentId: id, changes: req.body });
    return res.json({ success: true, data: dept });
  } catch (error) {
    return next(error);
  }
};

export const getDepartmentAcademicInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true } });
    const currentYear = currentYearRecord?.year || '2026-27';

    // Current HOD
    const currentHodRecord = await HOD.findOne({
      where: { departmentId: id, isActive: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage'] }],
    });

    const hodUser = (currentHodRecord as any)?.user;

    // Faculty summary
    const teachers = await Teacher.findAll({
      where: { departmentId: id },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status'] }],
    });

    const activeFacultyCount = teachers.filter((t: any) => t.user?.status === 'ACTIVE').length;
    const pendingFacultyCount = await FacultyAuthorizationRequest.count({
      where: { departmentId: id, status: 'PENDING' },
    });

    // Subjects summary
    const subjects = await Subject.findAll({
      where: {
        [Op.or]: [{ departmentId: id }, { departmentId: null }],
      },
      order: [['semester', 'ASC'], ['code', 'ASC']],
    });

    const theoryCount = subjects.filter((s) => s.type === 'Theory').length;
    const practicalCount = subjects.filter((s) => s.type === 'Practical').length;
    const electivesCount = subjects.filter((s) => s.type === 'Elective').length;

    // Sections & Semesters structure
    const sections = await Section.findAll({
      where: { departmentId: id },
      order: [['semester', 'ASC'], ['name', 'ASC']],
    });

    const studentCount = await Student.count({ where: { departmentId: id } });

    // Build semester breakdown (Semesters 1 to 8)
    const semesterStructure = [1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
      const semSections = sections.filter((s) => s.semester === semNum);
      const semSubjects = subjects.filter((s) => s.semester === semNum);
      return {
        semesterNumber: semNum,
        semesterName: `Semester ${semNum}`,
        sectionsCount: semSections.length,
        sections: semSections.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity })),
        subjectsCount: semSubjects.length,
        subjects: semSubjects.map((s) => ({ id: s.id, code: s.code, name: s.name, credits: s.credits, type: s.type })),
      };
    });

    return res.json({
      success: true,
      data: {
        department: {
          id: dept.id,
          name: dept.name,
          code: dept.code,
        },
        academicYear: currentYear,
        hod: hodUser ? {
          id: hodUser.id,
          name: `${hodUser.firstName} ${hodUser.lastName}`.trim(),
          email: hodUser.email,
          phone: hodUser.phone,
          profileImage: hodUser.profileImage,
          tenureStartDate: (currentHodRecord as any)?.tenureStartDate,
          appointmentOrderNo: (currentHodRecord as any)?.appointmentOrderNo,
          status: 'Active',
        } : null,
        stats: {
          facultyTotal: teachers.length,
          facultyActive: activeFacultyCount,
          facultyPending: pendingFacultyCount,
          subjectsTotal: subjects.length,
          subjectsTheory: theoryCount,
          subjectsPractical: practicalCount,
          subjectsElective: electivesCount,
          studentsTotal: studentCount,
          activeSectionsCount: sections.length,
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
        semesterStructure,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ─── 4. Semesters ──────────────────────────────────────────────────────────────

export const getSemesters = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { academicYear } = req.query;
    const where: any = {};
    if (academicYear) {
      where.academicYear = academicYear;
    }

    const semesters = await Semester.findAll({
      where,
      order: [['semesterNumber', 'ASC']],
    });

    return res.json({ success: true, data: semesters });
  } catch (error) {
    return next(error);
  }
};

export const createSemester = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { semesterNumber, semesterName, academicYear, startDate, endDate, status } = req.body;

    if (!semesterNumber || !academicYear || !startDate || !endDate) {
      return res.status(400).json({ error: 'Semester Number, Academic Year, Start Date, and End Date are required.' });
    }

    const existing = await Semester.findOne({
      where: { semesterNumber: Number(semesterNumber), academicYear },
    });

    if (existing) {
      return res.status(400).json({ error: `Semester ${semesterNumber} already exists for Academic Year ${academicYear}.` });
    }

    const semester = await Semester.create({
      semesterNumber: Number(semesterNumber),
      semesterName: semesterName || `Semester ${semesterNumber}`,
      academicYear,
      startDate,
      endDate,
      status: status || 'UPCOMING',
    });

    await logAudit(req, 'CREATE_SEMESTER', { semesterId: semester.id, semesterNumber, academicYear });
    return res.status(201).json({ success: true, data: semester });
  } catch (error) {
    return next(error);
  }
};

export const updateSemester = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { startDate, endDate, status } = req.body;

    const semester = await Semester.findByPk(id);
    if (!semester) {
      return res.status(404).json({ error: 'Semester not found.' });
    }

    await semester.update({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(status && { status }),
    });

    await logAudit(req, 'UPDATE_SEMESTER', { semesterId: id, changes: req.body });
    return res.json({ success: true, data: semester });
  } catch (error) {
    return next(error);
  }
};

// ─── 5. Sections ───────────────────────────────────────────────────────────────

export const getSections = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { departmentId, semester, academicYear } = req.query;
    const where: any = {};

    if (departmentId && departmentId !== 'ALL') where.departmentId = departmentId;
    if (semester && semester !== 'ALL') where.semester = Number(semester);
    if (academicYear && academicYear !== 'ALL') where.academicYear = academicYear;

    const sections = await Section.findAll({
      where,
      include: [{ model: Department, as: 'department', attributes: ['name', 'code'] }],
      order: [['semester', 'ASC'], ['name', 'ASC']],
    });

    return res.json({ success: true, data: sections });
  } catch (error) {
    return next(error);
  }
};

export const createSection = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { departmentId, semester, academicYear, name, capacity, status } = req.body;

    if (!departmentId || !semester || !academicYear || !name) {
      return res.status(400).json({ error: 'Department, Semester, Academic Year, and Section Name are required.' });
    }

    const existing = await Section.findOne({
      where: {
        departmentId,
        semester: Number(semester),
        academicYear,
        name: name.trim(),
      },
    });

    if (existing) {
      return res.status(400).json({ error: `Section ${name} already exists for this Department and Semester.` });
    }

    const section = await Section.create({
      departmentId,
      semester: Number(semester),
      academicYear,
      name: name.trim(),
      capacity: capacity ? Number(capacity) : 60,
      status: status || 'ACTIVE',
    });

    await logAudit(req, 'CREATE_SECTION', { sectionId: section.id, departmentId, semester, name });
    return res.status(201).json({ success: true, data: section });
  } catch (error) {
    return next(error);
  }
};

export const updateSection = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { capacity, status } = req.body;

    const section = await Section.findByPk(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    await section.update({
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(status && { status }),
    });

    await logAudit(req, 'UPDATE_SECTION', { sectionId: id, changes: req.body });
    return res.json({ success: true, data: section });
  } catch (error) {
    return next(error);
  }
};

// ─── 6. Subjects ───────────────────────────────────────────────────────────────

export const getSubjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, departmentId, semester, type } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    }
    if (semester && semester !== 'ALL') {
      where.semester = Number(semester);
    }
    if (type && type !== 'ALL') {
      where.type = type;
    }

    const subjects = await Subject.findAll({
      where,
      include: [{ model: Department, as: 'department', attributes: ['name', 'code'] }],
      order: [['semester', 'ASC'], ['code', 'ASC']],
    });

    return res.json({ success: true, data: subjects });
  } catch (error) {
    return next(error);
  }
};

export const createSubject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, code, semester, departmentId, credits, type, status } = req.body;

    if (!name || !code || !semester) {
      return res.status(400).json({ error: 'Subject Name, Subject Code, and Semester are required.' });
    }

    const existing = await Subject.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(400).json({ error: `Subject Code ${code} already exists.` });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      semester: Number(semester),
      departmentId: departmentId || null,
      credits: credits ? Number(credits) : 4,
      type: type || 'Theory',
      status: status || 'ACTIVE',
    });

    await logAudit(req, 'CREATE_SUBJECT', { subjectId: subject.id, code: subject.code, name: subject.name });
    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    return next(error);
  }
};

export const updateSubject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, code, semester, departmentId, credits, type, status } = req.body;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    if (code) {
      const conflict = await Subject.findOne({
        where: { id: { [Op.ne]: id }, code: code.trim().toUpperCase() },
      });
      if (conflict) {
        return res.status(400).json({ error: `Subject code ${code} is already in use.` });
      }
    }

    await subject.update({
      ...(name && { name: name.trim() }),
      ...(code && { code: code.trim().toUpperCase() }),
      ...(semester && { semester: Number(semester) }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(credits !== undefined && { credits: Number(credits) }),
      ...(type && { type }),
      ...(status && { status }),
    });

    await logAudit(req, 'UPDATE_SUBJECT', { subjectId: id, changes: req.body });
    return res.json({ success: true, data: subject });
  } catch (error) {
    return next(error);
  }
};

// ─── 7. HOD Management ─────────────────────────────────────────────────────────

export const getHods = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, departmentId, status } = req.query;

    const hodRecords = await HOD.findAll({
      where: status && status !== 'ALL' ? { isActive: status === 'ACTIVE' } : {},
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status', 'createdAt'],
          where: search
            ? {
                [Op.or]: [
                  { firstName: { [Op.iLike]: `%${search}%` } },
                  { lastName: { [Op.iLike]: `%${search}%` } },
                  { email: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : {},
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
          where: departmentId && departmentId !== 'ALL' ? { id: departmentId } : {},
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true } });
    const currentYear = currentYearRecord?.year || '2026-27';

    const formatted = hodRecords.map((h: any) => ({
      id: h.id,
      userId: h.userId,
      name: `${h.user?.firstName || ''} ${h.user?.lastName || ''}`.trim(),
      email: h.user?.email,
      phone: h.user?.phone,
      profileImage: h.user?.profileImage,
      departmentId: h.departmentId,
      departmentName: h.department?.name,
      departmentCode: h.department?.code,
      academicYear: currentYear,
      tenureStartDate: h.tenureStartDate,
      appointmentOrderNo: h.appointmentOrderNo,
      isActive: h.isActive,
      status: h.isActive ? 'Active' : 'Inactive',
      createdAt: h.createdAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};

export const createHod = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { firstName, lastName, email, phone, designation, departmentId, academicYear, joiningDate, tempPassword } = req.body;

    if (!firstName || !lastName || !email || !departmentId) {
      await t.rollback();
      return res.status(400).json({ error: 'First Name, Last Name, Email, and Department are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const dept = await Department.findByPk(departmentId);
    if (!dept) {
      await t.rollback();
      return res.status(404).json({ error: 'Department not found.' });
    }

    // Default or provided temporary password
    const rawPass = tempPassword && tempPassword.trim().length >= 6 ? tempPassword.trim() : 'password123';
    const passwordHash = await bcrypt.hash(rawPass, 10);

    const newUser = await User.create(
      {
        username: normalizedEmail,
        email: normalizedEmail,
        passwordHash,
        role: 'HOD',
        status: 'ACTIVE',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop',
        mustChangePassword: true,
      },
      { transaction: t }
    );

    // If there is an existing active HOD for this department, mark as inactive & complete in history
    const existingActiveHod = await HOD.findOne({
      where: { departmentId, isActive: true },
      transaction: t,
    });

    if (existingActiveHod) {
      await existingActiveHod.update({ isActive: false }, { transaction: t });
      await HODAssignmentHistory.update(
        { status: 'COMPLETED', endDate: new Date() },
        { where: { hodId: existingActiveHod.id, status: 'ACTIVE' }, transaction: t }
      );
    }

    const hod = await HOD.create(
      {
        userId: newUser.id,
        departmentId,
        tenureStartDate: joiningDate || new Date(),
        isActive: true,
        appointedByAdminId: req.user?.id || null,
        appointmentOrderNo: `APP-HOD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        appointmentDate: new Date(),
      },
      { transaction: t }
    );

    // Record assignment history
    await HODAssignmentHistory.create(
      {
        hodId: hod.id,
        userId: newUser.id,
        departmentId,
        academicYear: academicYear || '2026-27',
        startDate: joiningDate || new Date(),
        status: 'ACTIVE',
        assignedByUserId: req.user?.id || null,
      },
      { transaction: t }
    );

    await t.commit();
    await logAudit(req, 'CREATE_HOD', { hodId: hod.id, userId: newUser.id, email: newUser.email, departmentId });

    return res.status(201).json({
      success: true,
      message: 'HOD created successfully.',
      data: {
        id: hod.id,
        userId: newUser.id,
        email: newUser.email,
        temporaryPassword: rawPass,
      },
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

export const getHodById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const hod = await HOD.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status', 'createdAt'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      ],
    });

    if (!hod) {
      return res.status(404).json({ error: 'HOD record not found.' });
    }

    const history = await HODAssignmentHistory.findAll({
      where: { userId: hod.userId },
      include: [
        { model: Department, as: 'department', attributes: ['name', 'code'] },
        { model: User, as: 'assignedBy', attributes: ['firstName', 'lastName'] },
      ],
      order: [['startDate', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        hod,
        history,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const assignHod = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { hodUserId, departmentId, academicYear, startDate, endDate } = req.body;

    if (!hodUserId || !departmentId || !academicYear || !startDate) {
      await t.rollback();
      return res.status(400).json({ error: 'HOD, Department, Academic Year, and Start Date are required.' });
    }

    const user = await User.findByPk(hodUserId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    const dept = await Department.findByPk(departmentId);
    if (!dept) {
      await t.rollback();
      return res.status(404).json({ error: 'Department not found.' });
    }

    // Deactivate prior active HOD for this department
    const priorHod = await HOD.findOne({ where: { departmentId, isActive: true }, transaction: t });
    if (priorHod) {
      await priorHod.update({ isActive: false }, { transaction: t });
      await HODAssignmentHistory.update(
        { status: 'COMPLETED', endDate: new Date() },
        { where: { departmentId, status: 'ACTIVE' }, transaction: t }
      );
    }

    // Deactivate prior assignments for this user if they were active in another department
    await HOD.update({ isActive: false }, { where: { userId: hodUserId }, transaction: t });

    // Create or update HOD record
    let hod = await HOD.findOne({ where: { userId: hodUserId, departmentId }, transaction: t });
    if (hod) {
      await hod.update({
        isActive: true,
        tenureStartDate: startDate,
        appointmentDate: new Date(),
      }, { transaction: t });
    } else {
      hod = await HOD.create({
        userId: hodUserId,
        departmentId,
        tenureStartDate: startDate,
        isActive: true,
        appointedByAdminId: req.user?.id || null,
        appointmentOrderNo: `APP-HOD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        appointmentDate: new Date(),
      }, { transaction: t });
    }

    // Record History
    await HODAssignmentHistory.create({
      hodId: hod.id,
      userId: hodUserId,
      departmentId,
      academicYear,
      startDate,
      endDate: endDate || null,
      status: 'ACTIVE',
      assignedByUserId: req.user?.id || null,
    }, { transaction: t });

    await t.commit();
    await logAudit(req, 'ASSIGN_HOD', { hodUserId, departmentId, academicYear, startDate });

    return res.json({ success: true, message: 'HOD successfully assigned to department.' });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

export const getHodHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const history = await HODAssignmentHistory.findAll({
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'profileImage'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] },
        { model: User, as: 'assignedBy', attributes: ['firstName', 'lastName'] },
      ],
      order: [['startDate', 'DESC']],
    });

    const formatted = history.map((item: any) => ({
      id: item.id,
      hodName: `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim(),
      email: item.user?.email,
      profileImage: item.user?.profileImage,
      departmentName: item.department?.name,
      departmentCode: item.department?.code,
      academicYear: item.academicYear,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      assignedBy: item.assignedBy ? `${item.assignedBy.firstName} ${item.assignedBy.lastName}` : 'Dean Academics',
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};

// ─── 8. Faculty Management & Authorizations ────────────────────────────────────

export const getFacultyList = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, departmentId, status } = req.query;

    const whereUser: any = {};
    if (search) {
      whereUser[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (status && status !== 'ALL') {
      whereUser.status = status;
    }

    const teachers = await Teacher.findAll({
      where: departmentId && departmentId !== 'ALL' ? { departmentId } : {},
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status', 'createdAt'],
          where: whereUser,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const currentYearRecord = await AcademicYear.findOne({ where: { isCurrent: true } });
    const currentYear = currentYearRecord?.year || '2026-27';

    const formatted = await Promise.all(
      teachers.map(async (t: any) => {
        const assignments = await FacultyAssignment.findAll({
          where: { userId: t.userId, status: 'ACTIVE' },
          include: [{ model: Subject, as: 'subject', attributes: ['name', 'code'] }],
        });

        const subjectNames = assignments.map((a: any) => a.subject?.name).filter(Boolean);

        return {
          id: t.id,
          userId: t.userId,
          name: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim(),
          email: t.user?.email,
          phone: t.user?.phone,
          profileImage: t.user?.profileImage,
          departmentId: t.departmentId,
          departmentName: t.department?.name,
          departmentCode: t.department?.code,
          designation: t.designation,
          status: t.user?.status || 'ACTIVE',
          subjects: subjectNames.length > 0 ? subjectNames.join(', ') : 'General Faculty',
          academicYear: currentYear,
          joiningDate: t.joiningDate,
          createdAt: t.createdAt,
        };
      })
    );

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};

export const getFacultyAuthorizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, departmentId, status, academicYear } = req.query;
    const where: any = { authority: 'DEAN' };

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    }
    if (academicYear && academicYear !== 'ALL') {
      where.academicYear = academicYear;
    }

    const requests = await FacultyAuthorizationRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'faculty',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status'],
          where: search
            ? {
                [Op.or]: [
                  { firstName: { [Op.iLike]: `%${search}%` } },
                  { lastName: { [Op.iLike]: `%${search}%` } },
                  { email: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : {},
        },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'createdByHOD', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'decidedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = requests.map((item: any) => ({
      id: item.id,
      facultyId: item.facultyUserId,
      facultyName: `${item.faculty?.firstName || ''} ${item.faculty?.lastName || ''}`.trim(),
      email: item.faculty?.email,
      phone: item.faculty?.phone,
      profileImage: item.faculty?.profileImage,
      departmentId: item.departmentId,
      departmentName: item.department?.name,
      departmentCode: item.department?.code,
      subjectId: item.subjectId,
      subjectName: item.subject?.name || 'General Assignment',
      subjectCode: item.subject?.code || 'N/A',
      semester: item.semester,
      section: item.section,
      academicYear: item.academicYear,
      designation: item.designation,
      authority: item.authority,
      status: item.status,
      rejectionReason: item.rejectionReason,
      createdBy: item.createdByHOD ? `${item.createdByHOD.firstName} ${item.createdByHOD.lastName}` : 'HOD',
      createdDate: item.createdAt,
      decidedBy: item.decidedBy ? `${item.decidedBy.firstName} ${item.decidedBy.lastName}` : null,
      decidedAt: item.decidedAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};

export const getFacultyAuthorizationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const request = await FacultyAuthorizationRequest.findByPk(id, {
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'status'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits', 'type'] },
        { model: User, as: 'createdByHOD', attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'] },
        { model: User, as: 'decidedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!request) {
      return res.status(404).json({ error: 'Faculty authorization request not found.' });
    }

    return res.json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

export const approveFacultyAuthorization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const authReq = await FacultyAuthorizationRequest.findByPk(id, { transaction: t });
    if (!authReq) {
      await t.rollback();
      return res.status(404).json({ error: 'Authorization request not found.' });
    }

    if (authReq.status === 'APPROVED') {
      await t.rollback();
      return res.status(400).json({ error: 'This faculty request has already been approved.' });
    }

    // 1. Update Request Status
    await authReq.update(
      {
        status: 'APPROVED',
        decidedByUserId: req.user?.id || null,
        decidedAt: new Date(),
        rejectionReason: null,
      },
      { transaction: t }
    );

    // 2. Activate Faculty User Account
    await User.update(
      { status: 'ACTIVE' },
      { where: { id: authReq.facultyUserId }, transaction: t }
    );

    // 3. Ensure Teacher Record exists & is linked
    let teacher = await Teacher.findOne({
      where: { userId: authReq.facultyUserId },
      transaction: t,
    });

    if (!teacher) {
      teacher = await Teacher.create(
        {
          userId: authReq.facultyUserId,
          departmentId: authReq.departmentId,
          designation: authReq.designation || 'Assistant Professor',
          joiningDate: new Date(),
        },
        { transaction: t }
      );
    }

    // 4. Activate existing FacultyAssignment or create a new one if subject is assigned
    if (authReq.subjectId) {
      const existingAssignment = await FacultyAssignment.findOne({
        where: {
          userId: authReq.facultyUserId,
          subjectId: authReq.subjectId,
          semester: authReq.semester,
          section: authReq.section,
        },
        transaction: t,
      });

      if (existingAssignment) {
        await existingAssignment.update({ status: 'ACTIVE' }, { transaction: t });
      } else {
        await FacultyAssignment.create(
          {
            teacherId: teacher.id,
            userId: authReq.facultyUserId,
            departmentId: authReq.departmentId,
            subjectId: authReq.subjectId,
            semester: authReq.semester,
            section: authReq.section,
            academicYear: authReq.academicYear,
            status: 'ACTIVE',
            createdByHODId: authReq.createdByHODId,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    await logAudit(req, 'APPROVE_FACULTY_AUTHORIZATION', {
      requestId: id,
      facultyUserId: authReq.facultyUserId,
      departmentId: authReq.departmentId,
    });

    return res.json({
      success: true,
      message: 'Faculty authorization approved successfully. Faculty account is now active.',
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

export const rejectFacultyAuthorization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    const authReq = await FacultyAuthorizationRequest.findByPk(id, { transaction: t });
    if (!authReq) {
      await t.rollback();
      return res.status(404).json({ error: 'Authorization request not found.' });
    }

    await authReq.update(
      {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        decidedByUserId: req.user?.id || null,
        decidedAt: new Date(),
      },
      { transaction: t }
    );

    // Keep user suspended or inactive
    await User.update(
      { status: 'INACTIVE' },
      { where: { id: authReq.facultyUserId }, transaction: t }
    );

    await t.commit();
    await logAudit(req, 'REJECT_FACULTY_AUTHORIZATION', {
      requestId: id,
      facultyUserId: authReq.facultyUserId,
      reason: reason.trim(),
    });

    return res.json({
      success: true,
      message: 'Faculty authorization request rejected.',
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

export const getFacultyAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { departmentId, semester, academicYear, status, search } = req.query;
    const where: any = {};

    if (departmentId && departmentId !== 'ALL') where.departmentId = departmentId;
    if (semester && semester !== 'ALL') where.semester = Number(semester);
    if (academicYear && academicYear !== 'ALL') where.academicYear = academicYear;
    if (status && status !== 'ALL') where.status = status;

    const assignments = await FacultyAssignment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'],
          where: search
            ? {
                [Op.or]: [
                  { firstName: { [Op.iLike]: `%${search}%` } },
                  { lastName: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : {},
        },
        { model: Department, as: 'department', attributes: ['name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['name', 'code', 'credits', 'type'] },
      ],
      order: [['semester', 'ASC'], ['createdAt', 'DESC']],
    });

    const formatted = assignments.map((a: any) => ({
      id: a.id,
      facultyName: `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim(),
      email: a.user?.email,
      profileImage: a.user?.profileImage,
      departmentName: a.department?.name,
      departmentCode: a.department?.code,
      subjectName: a.subject?.name,
      subjectCode: a.subject?.code,
      subjectType: a.subject?.type,
      credits: a.subject?.credits,
      semester: a.semester,
      section: a.section,
      academicYear: a.academicYear,
      status: a.status,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};
